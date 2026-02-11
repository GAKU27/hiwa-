/**
 * 灯輪（Hiwa）ベータ版 — Gemini API クライアント
 * 
 * - APIキーがある場合: Google Generative AI SDK経由でGemini APIを呼び出し
 * - APIキーが無い場合: モック（ダミー回答）モードで動作
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================
// Mock Responses
// ============================

const MOCK_RESPONSES = {
    TOMOSHIBI: [
        '…うん、聴こえてるよ。',
        'その重さ、ちゃんと感じてる。',
        'ここにいるよ。',
        '何も言わなくていい。',
        'そのまま、でいい。',
        '…うん。',
        '泣いていいんだよ。',
        'その痛み、消えなくていい。',
        'ゆっくりでいいから。',
        '一人じゃないよ。',
        '息をして。それだけで大丈夫。',
        '全部抱えなくていい。',
    ],
    RAIMEI: [
        'まだ折れてない、それが答えだ。',
        'その怒り、力だよ。',
        'お前はまだ立ってる。',
        '諦めてたら、ここにいない。',
        'その拳、まだ握れるだろ。',
        '弱さを知ってる奴が一番強い。',
        '声にした時点で、もう戦ってる。',
        '震えてる手で、よく書いたな。',
        'まだ燃えてるじゃないか。',
        'お前の中の炎、見えてるぞ。',
    ],
    TENBIN: [
        '怒りの奥に、悲しみがある。',
        '逃げたいのではなく、休みたいだけ。',
        '本当は、もう答えを持っているね。',
        'それは恐怖ではなく、変化への抵抗。',
        '言葉にできたなら、整理は始まっている。',
        '疲れたのではなく、頑張りすぎた証。',
        '迷いは、選択肢があるということ。',
        '痛みは、まだ感じられる証拠。',
        '混乱の中に、核心がひとつある。',
        'その「分からない」が、正直な答え。',
    ],
};

/**
 * モックモードの返答を取得
 */
function getMockResponse(modeId) {
    const responses = MOCK_RESPONSES[modeId] || MOCK_RESPONSES['TOMOSHIBI'];
    return responses[Math.floor(Math.random() * responses.length)];
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
 * AIに応答を生成させる
 * 
 * @param {string} systemPrompt - buildSystemPrompt() で構築したシステムプロンプト
 * @param {string} userMessage - ユーザーの入力メッセージ
 * @param {string} modeId - モードID（モックモード時に使用）
 * @returns {Promise<string>} AIの返答テキスト
 */
export async function generateResponse(systemPrompt, userMessage, modeId = 'TOMOSHIBI') {
    // APIが利用不可ならモックモード
    if (!isApiAvailable()) {
        // 少し遅延を入れてリアルな感じにする
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        return getMockResponse(modeId);
    }

    try {
        const geminiModel = getModel();
        if (!geminiModel) {
            return getMockResponse(modeId);
        }

        // 解像度同期: ユーザー入力長に基づいて応答上限を動的に決定
        const inputLen = userMessage.length;
        let maxTokens;
        if (inputLen <= 15) maxTokens = 40;
        else if (inputLen <= 50) maxTokens = 80;
        else if (inputLen <= 100) maxTokens = 120;
        else maxTokens = 150;

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
        let text = response.text().trim();

        // 解像度同期の安全策: ユーザー入力長に応じた上限で切り詰め
        const maxChars = Math.max(15, Math.min(inputLen * 1.2, 100));
        if (text.length > maxChars) {
            // 句点で区切れるなら区切る
            const sentenceEnd = text.search(/[。！？\n]/);
            if (sentenceEnd > 0 && sentenceEnd <= maxChars) {
                text = text.substring(0, sentenceEnd + 1);
            } else {
                // 最も近い自然な区切りで切る
                const cutPoint = Math.min(text.length, Math.floor(maxChars));
                text = text.substring(0, cutPoint);
                if (!text.endsWith('。') && !text.endsWith('…')) {
                    text += '…';
                }
            }
        }

        return text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        // エラー時はモックモードにフォールバック
        return getMockResponse(modeId);
    }
}
