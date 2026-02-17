/**
 * モード別テーマ定義
 *
 * 各モードの視覚的アイデンティティを一箇所で管理。
 * 色、質感、アニメーション速度、角丸、余白、背景色温度すべてをモードごとに定義。
 */

export const MODE_THEMES = {
    TOMOSHIBI: {
        // ─── 色 ───
        accent: '#f59e0b',
        accentSoft: '#f59e0b88',
        accentDim: '#f59e0b40',
        accentGlow: '#f59e0b25',

        // ─── 背景の色温度 ───
        bgBase: 'rgba(13,10,8,1)',          // 暖色ベース — 暗い琥珀
        bgTop: 'rgba(15,12,10,1)',
        bgRadial: 'rgba(245,158,11,0.05)',  // 上部に温かい光

        // ─── 質感 ───
        borderRadius: '1rem',               // ソフトラウンド
        borderRadiusLg: '1.25rem',
        borderRadiusFull: '9999px',

        // ─── テキスト ───
        fontWeight: '300',                  // 繊細で柔らかい
        letterSpacing: '0.08em',
        welcomeSize: 'text-sm',

        // ─── アニメーション ───
        animSpeed: '3s',                    // ゆったり
        breathSpeed: '4s',
        glowIntensity: '0.12',

        // ─── ウェルカム ───
        welcome: '何も急がなくていい。',
        welcomeSub: '心にあることを、そのまま書いてみてください。',
        placeholder: 'ここに、心にあることを…',

        // ─── リサージュ ───
        lissajousOpacity: '0.12',
        lissajousStroke: '1.5',

        // ─── ダスト ───
        dustOpacity: '0.25',
        dustSize: '1',
    },

    RAIMEI: {
        // ─── 色 ───
        accent: '#a855f7',
        accentSoft: '#a855f788',
        accentDim: '#a855f740',
        accentGlow: '#a855f725',

        // ─── 背景の色温度 ───
        bgBase: 'rgba(10,8,16,1)',           // 深い紫ベース
        bgTop: 'rgba(12,10,20,1)',
        bgRadial: 'rgba(168,85,247,0.06)',

        // ─── 質感 ───
        borderRadius: '0.5rem',              // シャープ
        borderRadiusLg: '0.75rem',
        borderRadiusFull: '0.75rem',

        // ─── テキスト ───
        fontWeight: '500',                   // 力強い
        letterSpacing: '0.02em',
        welcomeSize: 'text-base',

        // ─── アニメーション ───
        animSpeed: '1.5s',                   // 速い、パルス的
        breathSpeed: '2s',
        glowIntensity: '0.2',

        // ─── ウェルカム ───
        welcome: '言葉にしろ。',
        welcomeSub: '何でもいい。ここにいる。',
        placeholder: '吐き出せ',

        // ─── リサージュ ───
        lissajousOpacity: '0.18',
        lissajousStroke: '2',

        // ─── ダスト ───
        dustOpacity: '0.35',
        dustSize: '1.5',
    },

    TENBIN: {
        // ─── 色 ───
        accent: '#64748b',
        accentSoft: '#64748b88',
        accentDim: '#64748b40',
        accentGlow: '#64748b25',

        // ─── 背景の色温度 ───
        bgBase: 'rgba(8,10,14,1)',            // 冷たい青灰ベース
        bgTop: 'rgba(10,12,18,1)',
        bgRadial: 'rgba(100,116,139,0.04)',

        // ─── 質感 ───
        borderRadius: '0.375rem',             // ミニマル、精密
        borderRadiusLg: '0.5rem',
        borderRadiusFull: '0.375rem',

        // ─── テキスト ───
        fontWeight: '400',                    // ニュートラル
        letterSpacing: '0.05em',
        welcomeSize: 'text-sm',

        // ─── アニメーション ───
        animSpeed: '5s',                      // 遅い、静的
        breathSpeed: '6s',
        glowIntensity: '0.08',

        // ─── ウェルカム ───
        welcome: '……観測を開始します。',
        welcomeSub: '心にあることを、入力してください。',
        placeholder: '入力してください',

        // ─── リサージュ ───
        lissajousOpacity: '0.08',
        lissajousStroke: '1',

        // ─── ダスト ───
        dustOpacity: '0.15',
        dustSize: '0.75',
    },
};
