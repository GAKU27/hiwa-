/**
 * 灯輪（Hiwa）ベータ版 — Gemini API クライアント
 *
 * - APIキーがある場合: Google Generative AI SDK経由でGemini APIを呼び出し
 * - APIキーが無い場合: モック（温かいミラーリング）モードで動作
 * - リトライ: 429エラー時は指数バックオフで最大3回リトライ
 * - サイレント解析: 応答末尾の |||{JSON}||| を分離し、色彩・トーンデータを返す
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ============================
// Mock — 温かいミラーリング
// ============================

// ユーザーの言葉を包み込むように映し返す語尾
const WARM_SUFFIXES = [
    '、のですね',
    '……そう、なんですね',
    '、ということなんですね',
    '……そう感じているのですね',
    '、と',
];

/**
 * ユーザーの入力を温かく映し返す（モック版ミラーリング）
 *
 * 機械的に繰り返すのではなく、受け取ったことを示す温かみのある反芻。
 * 重い言葉もそらさずに受け止めるが、冷たく突き返さない。
 */
function buildMockMirror(userMessage) {
    if (!userMessage || userMessage.trim().length === 0) {
        return '……。';
    }

    const input = userMessage.trim();
    // 文末の句読点・記号を除去
    const cleaned = input.replace(/[。！？、…\s]+$/g, '').trim();
    const suffix = WARM_SUFFIXES[Math.floor(Math.random() * WARM_SUFFIXES.length)];

    // 短い入力はそのまま映す
    if (cleaned.length <= 8) {
        return `……${cleaned}${suffix}。`;
    }

    // 長い入力は核心部分を抽出して映す
    // 句点「。」で分割して最後の文を取る（最も核心に近い）
    const sentences = cleaned.split(/[。、]/);
    const core = sentences[sentences.length - 1].trim() || cleaned;

    return `……${core}${suffix}。`;
}

/**
 * モックモードの返答を取得
 */
function getMockResponse(modeId, userMessage = '') {
    const text = buildMockMirror(userMessage);
    return {
        text,
        colorHex: null,
        tone: null,
    };
}

// ============================
// Gemini API Client
// ============================

let genAI = null;
let model = null;

/**
 * APIキーの取得
 */
function getApiKey() {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Gemini モデルインスタンスの取得
 * セーフティフィルターを緩和し、重い言葉にも対応可能にする
 */
function getModel() {
    if (model) return model;

    const apiKey = getApiKey();
    if (!apiKey) return null;

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });
    return model;
}

/**
 * APIが利用可能かどうかを返す
 */
export function isApiAvailable() {
    return !!getApiKey();
}

/**
 * サイレント解析JSONを応答テキストから分離する
 */
function parseSilentAnalysis(rawText) {
    const pattern = /\|\|\|\s*(\{[^}]+\})\s*\|\|\|/;
    const match = rawText.match(pattern);

    let text = rawText;
    let colorHex = null;
    let tone = null;

    if (match) {
        text = rawText.replace(pattern, '').trim();
        try {
            const data = JSON.parse(match[1]);
            if (data.color && /^#[0-9a-fA-F]{6}$/.test(data.color)) {
                colorHex = data.color;
            }
            if (data.tone) {
                tone = data.tone;
            }
        } catch (e) {
            console.warn('Silent analysis parse failed:', e);
        }
    }

    return { text, colorHex, tone };
}

/**
 * 指数バックオフ付きリトライでAPI呼び出し
 */
async function callWithRetry(chatInstance, userMessage, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await chatInstance.sendMessage(userMessage);
            return result;
        } catch (error) {
            const status = error?.status || error?.httpErrorCode || 0;
            const isRetryable = status === 429 || status === 503;

            if (isRetryable && attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                console.warn(`Gemini API ${status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

/**
 * AIに応答を生成させる
 *
 * @param {string} systemPrompt - buildSystemPrompt() で構築したシステムプロンプト
 * @param {string} userMessage - ユーザーの入力メッセージ
 * @param {string} modeId - モードID（モックモード時に使用）
 * @returns {Promise<{ text: string, colorHex: string|null, tone: string|null }>}
 */
export async function generateResponse(systemPrompt, userMessage, modeId = 'TOMOSHIBI') {
    if (!isApiAvailable()) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        return getMockResponse(modeId, userMessage);
    }

    try {
        const geminiModel = getModel();
        if (!geminiModel) {
            return getMockResponse(modeId, userMessage);
        }

        // トークン制限：プロンプト側で密度を制御するため、十分な余裕を持たせる
        // サイレント解析JSON分(約60トークン)も含む
        const maxTokens = 250;

        const chat = geminiModel.startChat({
            history: [],
            systemInstruction: systemPrompt,
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.75,
                topP: 0.9,
                topK: 40,
            },
        });

        const result = await callWithRetry(chat, userMessage);
        const response = result.response;
        const rawText = response.text().trim();

        const parsed = parseSilentAnalysis(rawText);
        const text = parsed.text;

        return {
            text,
            colorHex: parsed.colorHex,
            tone: parsed.tone,
        };
    } catch (error) {
        console.error('Gemini API Error:', error);
        // エラー時はモックで温かく映し返す
        return getMockResponse(modeId, userMessage);
    }
}
