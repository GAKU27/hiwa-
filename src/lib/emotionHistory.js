/**
 * 灯輪（Hiwa）— 感情履歴マネージャー
 *
 * 会話セッションの感情ベクトルをLocalStorageに永続化し、
 * Constellation（星座）ビューで可視化するためのデータを管理する。
 */

const STORAGE_KEY = 'hiwa_emotion_history';
const MAX_ENTRIES = 100;

// ============================
// データ構造
// ============================

/**
 * @typedef {Object} EmotionEntry
 * @property {string} id - ユニークID
 * @property {number} timestamp - Unix timestamp (ms)
 * @property {string} modeId - TOMOSHIBI / RAIMEI / TENBIN
 * @property {string} colorHex - 選択色
 * @property {string} weatherId - 天気ID
 * @property {number} silenceCoeff - 静寂係数
 * @property {number} vitalityCoeff - 活力係数
 * @property {number} depthCoeff - 深度係数
 * @property {boolean} adviceBan - アドバイス禁止フラグ
 * @property {number} messageCount - 会話のメッセージ数
 * @property {string} firstMessage - 最初のユーザーメッセージ（スナップショット）
 * @property {string} aiFirstResponse - 最初のAI応答
 */

// ============================
// パブリック API
// ============================

/**
 * 全履歴を取得
 * @returns {EmotionEntry[]}
 */
export function getHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Hiwa: Failed to read emotion history', e);
        return [];
    }
}

/**
 * 会話セッションを履歴に保存
 *
 * @param {Object} params
 * @param {Object} params.emotionVector - computeEmotionVector の返り値
 * @param {Array} params.messages - メッセージ配列 [{role, content}, ...]
 * @returns {EmotionEntry} 保存されたエントリ
 */
export function saveSession({ emotionVector, messages }) {
    const history = getHistory();

    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'ai');

    const entry = {
        id: `hiwa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        modeId: emotionVector.mode.id,
        colorHex: emotionVector.colorHex,
        weatherId: emotionVector.weather.id,
        silenceCoeff: emotionVector.silenceCoeff,
        vitalityCoeff: emotionVector.vitalityCoeff,
        depthCoeff: emotionVector.depthCoeff,
        adviceBan: emotionVector.adviceBan,
        messageCount: messages.length,
        firstMessage: userMessages[0]?.content || '',
        aiFirstResponse: aiMessages[0]?.content || '',
    };

    // 先頭に追加（新しい順）
    history.unshift(entry);

    // 上限を超えたら古いものを削除
    if (history.length > MAX_ENTRIES) {
        history.splice(MAX_ENTRIES);
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('Hiwa: Failed to save emotion history', e);
    }

    return entry;
}

/**
 * 履歴を全削除
 */
export function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * 星座ビュー用に正規化されたデータを返す
 * X = vitalityCoeff (0〜1)
 * Y = depthCoeff (0〜1, 上が高い)
 *
 * @returns {Array<{x: number, y: number, size: number, color: string, entry: EmotionEntry}>}
 */
export function getConstellationData() {
    const history = getHistory();

    return history.map(entry => ({
        x: entry.vitalityCoeff,
        y: entry.depthCoeff,
        size: Math.max(3, Math.min(12, entry.messageCount * 1.5)),
        color: entry.colorHex,
        entry,
    }));
}
