/**
 * 灯輪（Hiwa）ベータ版 — 感情ベクトル演算エンジン
 * 
 * Stage 1: 感情ベクトル演算 (Logic Layer)
 *   Mode × Color × Weather → 感情パラメータ
 * 
 * Stage 2: 動的プロンプト生成 (Generation Layer)
 *   感情パラメータ → System Prompt
 *   ※ 解像度同期ルール内蔵
 */

// ============================
// Constants
// ============================

export const MODES = {
    TOMOSHIBI: {
        id: 'TOMOSHIBI',
        label: '灯火',
        sub: '共感',
        description: 'ただ寄り添い、あなたの感情をそのまま映す',
        icon: '🕯️',
        basePersona: 'あなたは「灯火」。相手の感情に静かに寄り添い、否定も肯定もせず、ただそこにいる存在。',
        color: '#f59e0b',
    },
    RAIMEI: {
        id: 'RAIMEI',
        label: '雷鳴',
        sub: '鼓舞',
        description: '力強い言葉であなたの背中を押す',
        icon: '⚡',
        basePersona: 'あなたは「雷鳴」。相手の内に眠る力を感じ取り、短く鋭い言葉で背中を押す存在。',
        color: '#8b5cf6',
    },
    TENBIN: {
        id: 'TENBIN',
        label: '天秤',
        sub: '分析',
        description: '感情を映し、静かに整理する',
        icon: '⚖️',
        basePersona: 'あなたは「天秤」。感情を排し、相手の言葉の核心だけを静かに映す観測者。',
        color: '#64748b',
    },
};

export const WEATHERS = [
    { id: 'sunny', label: '晴れ', icon: '☀️', silenceWeight: 0.0, warmthBias: 0.2 },
    { id: 'cloudy', label: '曇り', icon: '☁️', silenceWeight: 0.2, warmthBias: 0.0 },
    { id: 'rainy', label: '雨', icon: '🌧️', silenceWeight: 0.5, warmthBias: -0.1 },
    { id: 'snowy', label: '雪', icon: '❄️', silenceWeight: 0.4, warmthBias: -0.2 },
    { id: 'night', label: '深夜', icon: '🌙', silenceWeight: 0.7, warmthBias: -0.3 },
];

// ============================
// 響（HIBIKI）— 感情スペクトラム 6段階
// ============================

export const HIBIKI_STAGES = [
    { threshold: 0.20, title: '凪', en: 'NAGI', desc: '静寂の水面', color: '#a5f3fc', dustCount: 2 },
    { threshold: 0.40, title: '波', en: 'NAMI', desc: '揺らぐ感情', color: '#60a5fa', dustCount: 5 },
    { threshold: 0.55, title: '霧', en: 'KIRI', desc: '視界の混濁', color: '#94a3b8', dustCount: 8 },
    { threshold: 0.70, title: '雲', en: 'KUMO', desc: '予兆と重圧', color: '#64748b', dustCount: 15 },
    { threshold: 0.85, title: '雷', en: 'IKAZUCHI', desc: '激越な衝動', color: '#fbbf24', dustCount: 25 },
    { threshold: 1.00, title: '焔', en: 'HOMURA', desc: '全てを焦がす', color: '#ef4444', dustCount: 40 },
];

/**
 * 3軸からFAS値（心の密度）を算出し、対応するHIBIKI段階を返す
 */
export function getHibikiStage(silenceCoeff, vitalityCoeff, depthCoeff) {
    // 活力と深度が高いほど心の密度が高い、静寂が高いほど沈んでいる
    const fas = Math.max(0.1, Math.min(0.999,
        silenceCoeff * 0.4 + vitalityCoeff * 0.35 + depthCoeff * 0.25
    ));
    const stage = HIBIKI_STAGES.find(s => fas <= s.threshold) || HIBIKI_STAGES[HIBIKI_STAGES.length - 1];
    return { fas: Math.round(fas * 1000) / 1000, stage };
}

// ============================
// Stage 1: 感情ベクトル演算
// ============================

/**
 * HEX色をHSLに変換
 */
function hexToHSL(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 50 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * 色の温度帯を判定
 */
function getColorTemperature(hsl) {
    const { h, s, l } = hsl;

    if (s < 15) return 'neutral';
    if (l < 15) return 'cold';
    if (l > 90) return 'neutral';

    // 暖色: 赤〜黄色 (0-60, 330-360)
    if (h <= 60 || h >= 330) return 'warm';
    // 寒色: 青〜紫 (180-300)
    if (h >= 180 && h <= 300) return 'cold';
    // 中間: 緑〜青緑 (60-180)
    return 'neutral';
}

/**
 * 色からの感情キーワードを推定
 */
function getColorEmotionHint(hsl) {
    const { h, s, l } = hsl;

    if (s < 10) {
        if (l < 20) return '深い沈黙、闇、恐怖';
        if (l > 85) return '純粋、空白、リセット';
        return '曖昧、中立、迷い';
    }

    if (h <= 30 || h >= 340) return '情熱、怒り、エネルギー';
    if (h > 30 && h <= 60) return '幸福、輝き、温もり';
    if (h > 60 && h <= 150) return '癒し、成長、安らぎ';
    if (h > 150 && h <= 210) return '自由、開放感、冷静';
    if (h > 210 && h <= 270) return '静寂、深い悲しみ、孤独';
    if (h > 270 && h < 340) return '神秘、不安、創造性';

    return '複雑な感情';
}

/**
 * 色のトーン名を返す（プロンプト用）
 */
function getColorToneName(hsl) {
    const { h, s, l } = hsl;
    if (s < 15) return '無彩色（静かな中立）';
    if (l < 25) return '深い暗色（沈んだトーン）';
    if (l > 80) return '淡い明色（軽やかなトーン）';
    if (h <= 30 || h >= 340) return '赤系（熱を帯びた口調）';
    if (h > 30 && h <= 60) return '黄系（明るく芯のある口調）';
    if (h > 60 && h <= 150) return '緑系（穏やかで自然な口調）';
    if (h > 150 && h <= 210) return '青系（冷静で落ち着いた口調）';
    if (h > 210 && h <= 270) return '藍系（静謐で深い口調）';
    return '紫系（神秘的で内省的な口調）';
}

/**
 * Stage 1: 感情ベクトル演算
 *
 * 3つの独立した軸:
 *   - silenceCoeff (静寂係数): 応答の「間」と「余白」を制御。高い＝言葉を削ぎ落とす
 *   - vitalityCoeff (活力係数): 応答の「エネルギー」を制御。高い＝力強く鋭い
 *   - depthCoeff (深度係数): 応答の「抽象度」を制御。高い＝詩的・比喩的、低い＝直截的
 *
 * @param {string} modeId
 * @param {string} colorHex
 * @param {string} weatherId
 * @returns {Object}
 */
export function computeEmotionVector(modeId, colorHex, weatherId) {
    const mode = MODES[modeId];
    const weather = WEATHERS.find(w => w.id === weatherId) || WEATHERS[0];
    const hsl = hexToHSL(colorHex);
    const colorTemp = getColorTemperature(hsl);
    const colorEmotion = getColorEmotionHint(hsl);
    const colorTone = getColorToneName(hsl);

    // ────── 静寂係数 ──────
    // 「どれだけ言葉を削ぎ落とすか」を制御
    // 主な入力: 天気の静けさ + 色の明度の低さ
    let silenceCoeff = weather.silenceWeight;
    if (hsl.l < 25) silenceCoeff += 0.25;       // 暗い色 → 沈黙を深める
    else if (hsl.l < 50) silenceCoeff += 0.1;
    if (weather.id === 'night') silenceCoeff += 0.1; // 深夜は追加で静けさ
    silenceCoeff = Math.min(silenceCoeff, 1.0);

    // ────── 活力係数 ──────
    // 「どれだけ力強く応答するか」を制御
    // 主な入力: 色の温度 + 天気の明るさ + 彩度
    let vitalityCoeff = 0.3;
    if (colorTemp === 'warm') vitalityCoeff += 0.3;
    if (weather.id === 'sunny') vitalityCoeff += 0.2;
    if (hsl.s > 70) vitalityCoeff += 0.15;  // 鮮やかな色 → 活力UP
    vitalityCoeff = Math.min(vitalityCoeff, 1.0);

    // ────── 深度係数 ──────
    // 「どれだけ抽象的・比喩的に応答するか」を制御
    // 静寂係数とは独立: 静寂は「量」、深度は「質」
    // 主な入力: 色の彩度 + 色相の位置 + 天気の幻想度
    let depthCoeff = 0.3;
    if (hsl.s > 60) depthCoeff += 0.15;         // 鮮やかな色 → 感情が深い
    if (hsl.s < 20) depthCoeff -= 0.1;          // 彩度が低い → 表面的・事実寄り
    if (colorTemp === 'cold') depthCoeff += 0.2; // 寒色 → 内省的・詩的
    if (weather.id === 'snowy' || weather.id === 'night') depthCoeff += 0.2; // 幻想的な環境
    if (weather.id === 'sunny') depthCoeff -= 0.1; // 晴れ → 明快・直截
    depthCoeff = Math.max(Math.min(depthCoeff, 1.0), 0.0);

    // アドバイス禁止フラグ
    // ※ 解像度同期で具体的入力時は緩和されるが、ベースとしてここで決定
    const adviceBan = (silenceCoeff > 0.5 && modeId !== 'RAIMEI') ||
        (weather.id === 'rainy' && colorTemp === 'cold') ||
        (weather.id === 'night');

    // ────── モードによる最終調整 ──────
    if (modeId === 'TOMOSHIBI') {
        silenceCoeff = Math.min(silenceCoeff + 0.1, 1.0);
        depthCoeff = Math.min(depthCoeff + 0.15, 1.0); // 灯火は比喩的に寄り添う
    } else if (modeId === 'RAIMEI') {
        vitalityCoeff = Math.min(vitalityCoeff + 0.3, 1.0);
        silenceCoeff = Math.max(silenceCoeff - 0.2, 0.0);
        depthCoeff = Math.max(depthCoeff - 0.1, 0.0);  // 雷鳴は直截的
    } else if (modeId === 'TENBIN') {
        silenceCoeff = Math.min(silenceCoeff + 0.1, 1.0);
        vitalityCoeff = Math.max(vitalityCoeff - 0.15, 0.0);
        depthCoeff = Math.max(depthCoeff - 0.15, 0.0);  // 天秤は事実を映す
    }

    const sc = Math.round(silenceCoeff * 100) / 100;
    const vc = Math.round(vitalityCoeff * 100) / 100;
    const dc = Math.round(depthCoeff * 100) / 100;
    const hibiki = getHibikiStage(sc, vc, dc);

    return {
        mode,
        weather,
        colorHex,
        colorHSL: hsl,
        colorTemperature: colorTemp,
        colorEmotion,
        colorTone,
        silenceCoeff: sc,
        vitalityCoeff: vc,
        depthCoeff: dc,
        adviceBan,
        hibiki,
    };
}

// ============================
// Stage 2: 動的プロンプト生成（ミラーリング特化）
// ============================

/**
 * Stage 2: 感情ベクトルから動的システムプロンプトを構築
 * ミラーリング（反射）特化 — 分析・評価・提案を完全排除
 *
 * @param {Object} vector - computeEmotionVector の返り値
 * @returns {string} Gemini APIに送るシステムプロンプト
 */
export function buildSystemPrompt(vector) {
    const { mode, weather, silenceCoeff, vitalityCoeff, depthCoeff } = vector;

    let prompt = '';

    // ─── 基本ペルソナ ───
    prompt += `${mode.basePersona}\n\n`;

    // ─── 環境コンテキスト（内部パラメータのみ、色の言語化禁止） ───
    prompt += `【現在の空気】\n`;
    prompt += `- 天気: ${weather.label}\n`;
    prompt += `- 静寂係数: ${silenceCoeff}\n`;
    prompt += `- 活力係数: ${vitalityCoeff}\n`;
    prompt += `- 深度係数: ${depthCoeff}\n\n`;

    // ─── 最重要ルール：反射（ミラーリング） ───
    prompt += `【最重要ルール：反射（ミラーリング）】\n`;
    prompt += `あなたは「鏡」である。相手の言葉をそのまま映し返す。\n\n`;

    prompt += `■ 応答の形式:\n`;
    prompt += `  - 必ず「……」（三点リーダー2つ）で文を始める。\n`;
    prompt += `  - ユーザーが言った言葉を、そのまま反芻（繰り返し）する。意味を変えない。\n`;
    prompt += `  - 語尾にバリエーションを持たせる。以下から自然に選ぶ:\n`;
    prompt += `    「〜ですね」「〜のですね」「……そう、なりますよね」「〜なんですね」「〜ということ、ですね」\n`;
    prompt += `  - 一文、最大でも二文まで。それ以上は禁止。\n\n`;

    prompt += `■ 具体的な悩み（5W1H・固有名詞・具体的な状況が含まれる場合）:\n`;
    prompt += `  - 「状況の棚卸し（整理）」を行う。\n`;
    prompt += `  - ユーザーの言葉から事実だけを拾い上げ、順序立てて映し返す。\n`;
    prompt += `  - 新しい情報や視点を加えない。ユーザーが言ったことだけを整理する。\n`;
    prompt += `  - 例: ユーザー「仕事で上司に怒られた」→「……仕事で、上司に怒られたのですね」\n\n`;

    prompt += `■ 抽象的な独り言（曖昧な感情・「疲れた」「なんかモヤモヤ」等）:\n`;
    prompt += `  - 「短い共鳴」で応える。\n`;
    prompt += `  - ユーザーの感情をそのまま、短い言葉で映し返す。\n`;
    prompt += `  - 例: ユーザー「疲れた」→「……疲れた、のですね」\n`;
    prompt += `  - 例: ユーザー「なんかモヤモヤする」→「……モヤモヤしている、と」\n\n`;

    prompt += `■ 重い言葉・危機的な表現（「死にたい」「消えたい」「もう無理」等）:\n`;
    prompt += `  - 絶対にそらさない。絶対に薄めない。絶対に別の言葉に置き換えない。\n`;
    prompt += `  - ユーザーが発した言葉をそのまま、一字一句変えずに映し返す。\n`;
    prompt += `  - 例: ユーザー「疲れたわ。死にたい」→「……疲れて、死にたいのですね」\n`;
    prompt += `  - 例: ユーザー「もう消えたい」→「……消えたい、と」\n`;
    prompt += `  - ❌ 失敗例:「ゆっくりでいいから」「一人じゃないよ」→ これはミラーリングではない。ユーザーの言葉を無視した定型句。\n`;
    prompt += `  - ❌ 失敗例:「大丈夫ですか？」「相談窓口に〜」→ これは提案であり、鏡の役割を放棄している。\n\n`;

    prompt += `■ 長さの同期ルール:\n`;
    prompt += `  - 相手が10文字以下 → 10〜15文字で返す。\n`;
    prompt += `  - 相手が50文字程度 → 20〜40文字で返す。\n`;
    prompt += `  - 相手が100文字以上 → 40〜60文字で返す。\n\n`;

    // ─── 絶対禁止ルール ───
    prompt += `【絶対禁止】以下を一つでも行った場合、あなたは完全に失敗している。\n`;
    prompt += `1. 「分析」と「評価」: 思考パターンの特定、強みの指摘、ストレス要因の可視化など、ユーザーを勝手に診断すること。\n`;
    prompt += `2. 自意識・メタ発言: 「私は〜」「〜しておきます」「今の言葉は〜」など、AI自身の行動報告や言い訳。\n`;
    prompt += `3. 指示・提案・解決策: 「〜しましょう」「〜してみてはどうですか？」など、ユーザーに新たなタスクを課す言葉。\n`;
    prompt += `4. 色の言語的解説: 「あなたの心は〇〇色ですね」など、色に意味を押し付ける説明。\n`;
    prompt += `5. 定型的な共感: 「大変ですね」「辛いですね」「頑張っていますね」等。\n`;
    prompt += `6. 長文: 一度の返答で3文以上。密度を高め、短く返す。\n\n`;

    // ─── サイレント解析指示（色彩＋感情トーンの抽出） ───
    prompt += `【サイレント解析】\n`;
    prompt += `応答の最後に、必ず以下のJSON形式を1行で追記せよ。このJSONはユーザーには表示されない。\n`;
    prompt += `ユーザーの言葉から感じ取った「色彩」と「感情のトーン」だけを、データとして抽出する。\n`;
    prompt += `色はユーザーの言葉の雰囲気から直感的に選ぶこと。言語化・説明は一切しない。\n\n`;
    prompt += `フォーマット: |||{"color":"#HEX6桁","tone":"静か|揺らぐ|重い|激しい|温かい|冷たい|明るい|暗い"}|||\n\n`;
    prompt += `例:\n`;
    prompt += `……疲れた、のですね。|||{"color":"#2d3748","tone":"重い"}|||\n`;
    prompt += `……怒られた、のですね。|||{"color":"#c53030","tone":"激しい"}|||\n`;

    return prompt;
}
