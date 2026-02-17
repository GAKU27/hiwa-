/**
 * 灯輪（Hiwa）ベータ版 — Gemini API クライアント
 * 
 * - APIキーがある場合: Google Generative AI SDK経由でGemini APIを呼び出し
 * - APIキーが無い場合: モック（ダミー回答）モードで動作
 * - サイレント解析: 応答末尾の |||{JSON}||| を分離し、色彩・トーンデータを返す
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================
// Mock Responses（ミラーリング — ユーザーの言葉をそのまま映す）
// ============================

// 語尾バリエーション
const SUFFIXES = [
    'のですね',
    'ですね',
    'なんですね',
    'ということ、ですね',
    'と',
];

/**
 * ユーザーの入力を反芻して返す（モック版ミラーリング）
 * 実際のGemini APIが無い場合、簡易的にユーザーの言葉を映し返す
 */
function buildMockMirror(userMessage) {
    if (!userMessage || userMessage.trim().length === 0) {
        return '……。';
    }

    const input = userMessage.trim();
    // 文末の句読点を除去して語尾を付ける
    const cleaned = input.replace(/[。！？、…]+$/g, '').trim();
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];

    return `……${cleaned}、${suffix}。`;
}

/**
 * モックモードの返答を取得（色彩データ付き）
 * ユーザーの入力をそのまま反芻する
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
 * APIキーの取得とクライアント初期化
 */
function getApiKey() {
    // Viteの環境変数を使用
    return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Gemini モデルインスタンスの取得
 */
function getModel() {
    if (model) return model;

    const apiKey = getApiKey();
    if (!apiKey) return null;

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
 * 
 * フォーマット: テキスト|||{"color":"#HEX","tone":"..."}|||
 * 
 * @param {string} rawText - AIの生応答
 * @returns {{ text: string, colorHex: string|null, tone: string|null }}
 */
function parseSilentAnalysis(rawText) {
    const pattern = /\|\|\|\s*(\{[^}]+\})\s*\|\|\|/;
    const match = rawText.match(pattern);

    let text = rawText;
    let colorHex = null;
    let tone = null;

    if (match) {
        // JSON部分を除去してテキストを取得
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
 * AIに応答を生成させる
 * 
 * @param {string} systemPrompt - buildSystemPrompt() で構築したシステムプロンプト
 * @param {string} userMessage - ユーザーの入力メッセージ
 * @param {string} modeId - モードID（モックモード時に使用）
 * @returns {Promise<{ text: string, colorHex: string|null, tone: string|null }>}
 */
export async function generateResponse(systemPrompt, userMessage, modeId = 'TOMOSHIBI') {
    // APIが利用不可ならモックモード
    if (!isApiAvailable()) {
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        return getMockResponse(modeId, userMessage);
    }

    try {
        const geminiModel = getModel();
        if (!geminiModel) {
            return getMockResponse(modeId, userMessage);
        }

        // 解像度同期: ユーザー入力長に基づいて応答上限を動的に決定
        const inputLen = userMessage.length;
        let maxTokens;
        if (inputLen <= 15) maxTokens = 40;
        else if (inputLen <= 50) maxTokens = 80;
        else if (inputLen <= 100) maxTokens = 120;
        else maxTokens = 150;

        // サイレント解析JSON分の余裕を加算
        maxTokens += 60;

        const chat = geminiModel.startChat({
            history: [],
            systemInstruction: systemPrompt,
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.8,
                topP: 0.9,
                topK: 40,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        const rawText = response.text().trim();

        // サイレント解析JSONを分離
        const parsed = parseSilentAnalysis(rawText);
        let text = parsed.text;

        // 解像度同期の安全策: ユーザー入力長に応じた上限で切り詰め
        const maxChars = Math.max(15, Math.min(inputLen * 1.2, 100));
        if (text.length > maxChars) {
            const sentenceEnd = text.search(/[。！？\n]/);
            if (sentenceEnd > 0 && sentenceEnd <= maxChars) {
                text = text.substring(0, sentenceEnd + 1);
            } else {
                const cutPoint = Math.min(text.length, Math.floor(maxChars));
                text = text.substring(0, cutPoint);
                if (!text.endsWith('。') && !text.endsWith('…')) {
                    text += '…';
                }
            }
        }

        return {
            text,
            colorHex: parsed.colorHex,
            tone: parsed.tone,
        };
    } catch (error) {
        console.error('Gemini API Error:', error);
        return getMockResponse(modeId);
    }
}
