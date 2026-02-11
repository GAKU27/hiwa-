/**
 * 灯輪（Hiwa）— 環境音フィードバックエンジン
 *
 * Web Audio API のみで環境音をシンセサイズ（外部ファイル不要）。
 * 天気ごとに異なる音響レイヤーを生成し、モードに応じた
 * イベント音（チャイム、ベル）も提供する。
 */

// ============================
// AudioContext シングルトン
// ============================

let audioCtx = null;
let masterGain = null;
let ambientNodes = [];
let isMuted = false;
let currentWeather = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(audioCtx.destination);
    }
    // Resume if suspended (autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ============================
// ユーティリティ
// ============================

function createGain(ctx, value = 0.1) {
    const g = ctx.createGain();
    g.gain.value = value;
    return g;
}

function createFilter(ctx, type, frequency, Q = 1) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = Q;
    return f;
}

// ============================
// 天気別アンビエント生成
// ============================

/**
 * 晴れ: 高周波の柔らかいトーン + 倍音
 */
function createSunnyAmbient(ctx) {
    const nodes = [];

    // 基礎トーン: 柔らかいサイン波
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 523.25; // C5
    const gain1 = createGain(ctx, 0.02);
    osc1.connect(gain1);

    // 倍音
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 659.25; // E5
    const gain2 = createGain(ctx, 0.012);
    osc2.connect(gain2);

    // 緩やかなLFOでゆらぎを作る
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = createGain(ctx, 3);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    gain1.connect(masterGain);
    gain2.connect(masterGain);

    osc1.start();
    osc2.start();
    lfo.start();

    nodes.push(osc1, osc2, lfo, gain1, gain2, lfoGain);
    return nodes;
}

/**
 * 曇り: 低いドローン + 微細なノイズ
 */
function createCloudyAmbient(ctx) {
    const nodes = [];

    // ドローン
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 110; // A2
    const gain = createGain(ctx, 0.03);
    osc.connect(gain);

    // ピッチドリフト
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoG = createGain(ctx, 2);
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    // 微細なフィルタードノイズ
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = createFilter(ctx, 'lowpass', 200, 0.5);
    const noiseGain = createGain(ctx, 0.008);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    gain.connect(masterGain);
    noiseGain.connect(masterGain);

    osc.start();
    lfo.start();
    noise.start();

    nodes.push(osc, lfo, noise, gain, lfoG, noiseFilter, noiseGain);
    return nodes;
}

/**
 * 雨: フィルタード・ホワイトノイズ + しずく音
 */
function createRainyAmbient(ctx) {
    const nodes = [];

    // レインノイズ
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // バンドパスフィルターで雨っぽい音に
    const filter = createFilter(ctx, 'bandpass', 3000, 0.3);
    const gain = createGain(ctx, 0.04);
    noise.connect(filter);
    filter.connect(gain);

    // フィルターのゆらぎ
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = createGain(ctx, 500);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    gain.connect(masterGain);

    noise.start();
    lfo.start();

    nodes.push(noise, filter, gain, lfo, lfoGain);

    // しずく音（ランダムに再生するタイマー）
    const dripInterval = setInterval(() => {
        if (isMuted || !audioCtx) return;
        const dripOsc = ctx.createOscillator();
        dripOsc.type = 'sine';
        dripOsc.frequency.value = 800 + Math.random() * 1200;
        const dripGain = ctx.createGain();
        dripGain.gain.setValueAtTime(0.015, ctx.currentTime);
        dripGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        dripOsc.connect(dripGain);
        dripGain.connect(masterGain);
        dripOsc.start(ctx.currentTime);
        dripOsc.stop(ctx.currentTime + 0.15);
    }, 1500 + Math.random() * 3000);

    // intervalをnodes配列にpushして後でクリアできるように
    nodes._dripInterval = dripInterval;

    return nodes;
}

/**
 * 雪: 極めて静かなサイン波（結晶化した静寂）
 */
function createSnowyAmbient(ctx) {
    const nodes = [];

    // 高く透明なサイン波
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 1046.5; // C6
    const gain1 = createGain(ctx, 0.008);
    osc1.connect(gain1);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1318.5; // E6
    const gain2 = createGain(ctx, 0.005);
    osc2.connect(gain2);

    // 非常に遅いLFOで存在を揺らす
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.03;
    const lfoGain = createGain(ctx, 5);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    // 振幅もゆらす
    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.07;
    const lfo2Gain = createGain(ctx, 0.004);
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(gain1.gain);

    gain1.connect(masterGain);
    gain2.connect(masterGain);

    osc1.start();
    osc2.start();
    lfo.start();
    lfo2.start();

    nodes.push(osc1, osc2, lfo, lfo2, gain1, gain2, lfoGain, lfo2Gain);
    return nodes;
}

/**
 * 深夜: 深いサブベース + 微かなクリック音
 */
function createNightAmbient(ctx) {
    const nodes = [];

    // サブベース
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55; // A1
    const gain = createGain(ctx, 0.035);
    osc.connect(gain);

    // サブベースの微かなうねり
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.02;
    const lfoGain = createGain(ctx, 1.5);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.connect(masterGain);
    osc.start();
    lfo.start();

    nodes.push(osc, lfo, gain, lfoGain);

    // 微かなクリック音（ランダム）
    const clickInterval = setInterval(() => {
        if (isMuted || !audioCtx) return;
        const clickOsc = ctx.createOscillator();
        clickOsc.type = 'square';
        clickOsc.frequency.value = 2000 + Math.random() * 2000;
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.003, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
        clickOsc.connect(clickGain);
        clickGain.connect(masterGain);
        clickOsc.start(ctx.currentTime);
        clickOsc.stop(ctx.currentTime + 0.03);
    }, 3000 + Math.random() * 5000);

    nodes._clickInterval = clickInterval;

    return nodes;
}

// ============================
// パブリック API
// ============================

/**
 * 天気に応じた環境音を開始
 */
export function startAmbient(weatherId) {
    stopAmbient();
    const ctx = getAudioContext();
    currentWeather = weatherId;

    switch (weatherId) {
        case 'sunny':
            ambientNodes = createSunnyAmbient(ctx);
            break;
        case 'cloudy':
            ambientNodes = createCloudyAmbient(ctx);
            break;
        case 'rainy':
            ambientNodes = createRainyAmbient(ctx);
            break;
        case 'snowy':
            ambientNodes = createSnowyAmbient(ctx);
            break;
        case 'night':
            ambientNodes = createNightAmbient(ctx);
            break;
        default:
            ambientNodes = createCloudyAmbient(ctx);
    }
}

/**
 * 環境音を停止
 */
export function stopAmbient() {
    if (ambientNodes._dripInterval) clearInterval(ambientNodes._dripInterval);
    if (ambientNodes._clickInterval) clearInterval(ambientNodes._clickInterval);

    ambientNodes.forEach(node => {
        try {
            if (node.stop) node.stop();
            if (node.disconnect) node.disconnect();
        } catch (e) {
            // already stopped
        }
    });
    ambientNodes = [];
    currentWeather = null;
}

/**
 * メッセージ送信チャイム
 * modeColorHex に応じた周波数でチャイム音を生成
 */
export function playSendChime(modeColorHex = '#f59e0b') {
    if (isMuted) return;
    const ctx = getAudioContext();

    // 色相から周波数を導出（暖色=低め、寒色=高め）
    const r = parseInt(modeColorHex.slice(1, 3), 16) / 255;
    const baseFreq = 400 + r * 200; // 400-600Hz

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // 倍音
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 1.5;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.025, ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.35);
}

/**
 * AI応答完了ベル
 */
export function playResponseBell() {
    if (isMuted) return;
    const ctx = getAudioContext();

    // 2音の和音ベル
    [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.6);
    });
}

/**
 * ミュート切り替え
 */
export function toggleMute() {
    isMuted = !isMuted;
    if (masterGain) {
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.3, audioCtx.currentTime, 0.1);
    }
    return isMuted;
}

/**
 * ミュート状態を取得
 */
export function getMuteState() {
    return isMuted;
}

/**
 * 完全クリーンアップ
 */
export function destroyAudio() {
    stopAmbient();
    if (audioCtx) {
        audioCtx.close().catch(() => { });
        audioCtx = null;
        masterGain = null;
    }
}
