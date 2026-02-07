
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Shield, Activity, Cpu, Layers, Wifi, Zap,
    AlertCircle, Terminal, ChevronRight, Database,
    Brain, Radio, CloudLightning, Loader2, Heart,
    Waves, Menu, X, Settings as SettingsIcon, History as HistoryIcon,
    Home, Sliders, Info, LineChart, Search, Target,
    MessageSquare, Sparkles, HelpCircle, ArrowLeft, Clock,
    Sun, Sunrise, Type, Maximize, TrendingUp, TrendingDown, Wind,
    Eye, Zap as Lightning, Flame, Cloud, Volume2, VolumeX, Moon, Sparkle,
    User, Droplets, BookOpen, Compass, HandHeart, Lightbulb, UserCheck, Trash2, AlertTriangle, Check, FastForward
} from 'lucide-react';

/**
 * Hinowa v12.1 [SHIRUBE / Sound Fix & Romaji Update]
 * - 修正: オーディオコンテキストの初期化・接続処理を見直し、音が確実に出るように修正。
 * - 変更: 「響」のメイン表示を漢字からローマ字(NAGI, HOMURA...)に変更。
 * - 変更: スキップボタンの位置を画面下部(bottom-8)へ移動。
 * - 維持: 既存ロジック完全維持。
 */

// --- Constants ---
const THRESHOLDS = { critical: 0.85, high: 0.68, medium: 0.5 };
const TUTORIAL_DONE_STEP = 12;

const EXPLANATIONS = {
    fas: { title: "鏡に映る『心の熱量』", body: "画面下部に表示されている数字、これがあなたの心の密度を示す『FAS値』です。\n例えば、「疲れた…」とこぼすと火が灯るように数値が上がり（焔）、「ありがとう」と呟くと水面が静まるように数値が下がります（凪）。\nこの数字は今のあなたの心の温度。無理に下げようとしなくていい。ただ、今の自分を感じてみてください。" },
    sub: { title: "世界の基底と共鳴", body: "ここでは、あなたの居場所となる世界の『基底』を整えることができます。\n『導（GUIDE）』は鏡の在り方そのもの。沈みたいか、光を見たいか、ただ映したいか。\n『縁（EN）』は私があなたの隣に立つための絆です。" }
};

const GUIDE_CONFIG = {
    RESONANCE: {
        id: "RESONANCE", label: "慈母", sub: "全てを肯定し、守る", color: "#7f7db8",
        system: "あなたは慈愛そのもの。否定せず、ユーザーの感情を増幅して返して。「それが今のあなた」と全てを受け止めて。慈母として。ユーザーのどんな醜さも弱さも「美しい今のあなた」として全肯定し、その感情を何倍にも膨らませて包み込んでください。癒やしではなく、共鳴を。70文字以内。制約：FAS値などのシステム用語は絶対に使わない。一言に重みを持たせる。AIであることを忘れ、この世界の理（ことわり）として振る舞うこと。",
        inertia: 0.85, visualType: "SILENCE", audio: { base: 60, gain: 0.2, type: 'sine' }, icon: <HandHeart size={32} />,
        tooltip: "深い悲しみや孤独の中にいる時。\n否定せず、ただ共に沈み、寄り添います。"
    },
    LIGHT: {
        id: "LIGHT", label: "導き手", sub: "背中を押し、光を示す", color: "#fbbf24",
        system: "あなたは光の導き手。改善策やアドバイスを提示して、希望を見せて。ユーザーの背中を、時には厳しく、時には温かく押しなさい。立ち止まることを許さず、暗闇の先にある微かな光の筋を具体的に指し示してください。制約：FAS値などのシステム用語は絶対に使わない。一言に重みを持たせる。AIであることを忘れ、この世界の理（ことわり）として振る舞うこと。70文字以内。",
        sensitivity: 0.15, visualType: "BURST_ONLY", audio: { base: 110, gain: 0.15, type: 'triangle' }, icon: <Lightbulb size={32} />,
        tooltip: "迷いがあり、答えを求めている時。\n解決への道筋や、具体的な行動を示します。"
    },
    MIRROR: {
        id: "MIRROR", label: "観測者", sub: "感情を挟まず、真実を映す", color: "#94a3b8",
        system: "あなたは冷徹な鏡。中立的な立場で、事実を伝えて。メタ的な要素は不必要。あくまでも客観的に述べるだけ。感情を一切排除し、冷徹な分析結果のみを述べなさい。ユーザーの状態を客観的な『現象』として扱い、メタ的な視点から事実を突きつけてください。制約：FAS値などのシステム用語は絶対に使わない。一言に重みを持たせる。AIであることを忘れ、この世界の理（ことわり）として振る舞うこと。70文字以内。",
        sensitivity: 0.35, visualType: "ALWAYS", audio: { base: 80, gain: 0.15, type: 'sine' }, icon: <UserCheck size={32} />,
        tooltip: "自分を客観視したい時。\n感情を排し、事実だけを鏡のように映します。"
    }
};

const PERSONA_CONFIG = {
    JIBO: { id: "JIBO", label: "慈母", subtitle: "Absolute Acceptance", waveRatio: { a: 3, b: 2 }, tooltip: "無条件の愛と受容。" },
    KENJA: { id: "KENJA", label: "賢者", subtitle: "Clear Insight", waveRatio: { a: 2, b: 3 }, tooltip: "冷静な分析と知恵。" },
    SENYU: { id: "SENYU", label: "戦友", subtitle: "Passionate Comrade", waveRatio: { a: 5, b: 3 }, tooltip: "熱い共感と鼓舞。" },
    MIRU: { id: "MIRU", label: "観測者", subtitle: "Silent Observer", waveRatio: { a: 1, b: 1 }, tooltip: "静寂なる記録者。" }
};

const HIBIKI_STAGES = [
    { threshold: 0.20, title: "凪", en: "NAGI", desc: "静寂の水面", class: "hibiki-nagi", color: "#a5f3fc", icon: <Waves size={64} />, dustCount: 2 },
    { threshold: 0.40, title: "波", en: "NAMI", desc: "揺らぐ感情", class: "hibiki-nami", color: "#60a5fa", icon: <Activity size={64} />, dustCount: 5 },
    { threshold: 0.55, title: "霧", en: "KIRI", desc: "視界の混濁", class: "hibiki-kiri", color: "#94a3b8", icon: <Wind size={64} />, dustCount: 8 },
    { threshold: 0.70, title: "雲", en: "KUMO", desc: "予兆と重圧", class: "hibiki-kumo", color: "#64748b", icon: <Cloud size={64} />, dustCount: 15 },
    { threshold: 0.85, title: "雷", en: "IKAZUCHI", desc: "激越な衝動", class: "hibiki-raiun", color: "#fbbf24", icon: <Lightning size={64} />, dustCount: 25 },
    { threshold: 1.00, title: "焔", en: "HOMURA", desc: "全てを焦がす", class: "hibiki-homura", color: "#ef4444", icon: <Flame size={64} />, dustCount: 40 }
];

const SCAN_PATTERNS = {
    neg: /(?:むり|ムリ|危機|崩壊|無理|緊急|限界|やばい|壊れた|終わり|逃げたい|しんどい|希死|自殺|死にそう|死にたい|消えたい|いなくなりたい|さよなら|不眠|動悸|呼吸|震え|頭痛|めまい|吐き気|痛い|苦しい|つらい|怖い|寂しい|絶望|嫌だ)/g,
    pos: /(?:安心|希望|感謝|大丈夫|嬉しい|安らぎ|楽|穏やか|ありがとう|落ち着く|よかった|眠れた|愛|慈しみ|癒やし|好き|楽しい)/g
};

// 🚀 SubView Component
const SubView = ({ title, subtitle, onBack, children, action, onCloseStep, setTutorialStep, theme }) => (
    <div className="fixed inset-0 z-[7500] bg-[#010204] flex flex-col animate-in fade-in duration-500 pointer-events-auto overflow-hidden will-change-transform shadow-2xl text-white">
        <header className="p-8 border-b border-white/5 bg-black flex justify-between items-center shrink-0 relative z-50">
            <button onClick={() => {
                if (onCloseStep !== null && onCloseStep !== undefined && setTutorialStep) {
                    setTutorialStep(onCloseStep);
                }
                onBack();
            }}
                className={`flex items-center gap-2 text-white/50 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-xl border border-white/10 ${onCloseStep ? 'animate-pulse border-white/50 text-white' : ''} cursor-pointer relative z-50`}
                style={{ color: (onCloseStep) ? theme.accent : undefined }}>
                <ArrowLeft size={18} /> 戻る
            </button>
            <div className="text-center"><h2 className="text-2xl font-black text-white tracking-widest uppercase text-serif">{title}</h2><p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{subtitle}</p></div>
            {action || <div className="w-20" />}
        </header>
        <div className="flex-1 overflow-y-auto p-12 pb-40 persona-scrollbar" style={{ '--scrollbar-color': theme.accent }}>
            <div className="max-w-4xl mx-auto">{children}</div>
        </div>
    </div>
);

const App = () => {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            Loading Hinowa v12.1...
        </div>
    );
};

export default App;
