
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
    // --- 1. Persistence Helper ---
    const loadSavedState = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(`hinowa_${key}`);
            if (!saved) return defaultValue;
            const parsed = JSON.parse(saved);
            return parsed !== null && parsed !== undefined ? parsed : defaultValue;
        } catch (e) { return defaultValue; }
    };

    // --- 2. State Hooks ---
    const [guideMode, setGuideMode] = useState(() => loadSavedState('guideMode', 'MIRROR'));
    const [currentView, setCurrentView] = useState('鏡');
    const [inputText, setInputText] = useState('');
    const [sensitivity, setSensitivity] = useState(0.5);
    const [envMode, setEnvMode] = useState('SEA');
    const [enPersona, setEnPersona] = useState('KENJA');

    const [rotation, setRotation] = useState(0);
    const [isBursting, setIsBursting] = useState(false);
    const [isPureMode, setIsPureMode] = useState(false);
    const [jitter, setJitter] = useState(0);
    const [thermalGlow, setThermalGlow] = useState(0);
    const [breathDuration, setBreathDuration] = useState(10);
    const [isDiving, setIsDiving] = useState(false);
    const [waveformTime, setWaveformTime] = useState(0);
    const [typingLuminance, setTypingLuminance] = useState(0);

    const [tutorialStep, setTutorialStep] = useState(() => {
        try {
            const done = localStorage.getItem('hinowa_intro_done');
            return done === 'true' ? TUTORIAL_DONE_STEP : 0;
        } catch (e) { return 0; }
    });

    const [showGuideDelayed, setShowGuideDelayed] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApiLoading, setIsApiLoading] = useState(false);
    const [audioStatus, setAudioStatus] = useState('off');
    const [fontSize, setFontSize] = useState(18);
    const [panelWidth, setPanelWidth] = useState(28);
    const [isClearConfirming, setIsClearConfirming] = useState(false);

    const [result, setResult] = useState(() => loadSavedState('result', { FAS: 0.300, level: 'low', summary: 'おかえり。続きを話そうか。' }));
    const [history, setHistory] = useState(() => {
        const h = loadSavedState('history', []);
        return Array.isArray(h) && h.length > 0 ? h : [{ fas: 0.300, level: 'low', timestamp: Date.now() - 3600000, text: "同期開始。", persona: 'MIRROR' }];
    });

    const lastKeyTime = useRef(Date.now());
    const audioCtx = useRef(null);
    const mainGain = useRef(null);
    const panner = useRef(null);
    const droneOscs = useRef([]);
    const tutorialStepRef = useRef(tutorialStep);
    const processingStartTime = useRef(null);
    const consecutivePosStats = useRef(0);

    // --- 3. Auto Save ---
    useEffect(() => {
        localStorage.setItem('hinowa_guideMode', JSON.stringify(guideMode));
        localStorage.setItem('hinowa_result', JSON.stringify(result));
        localStorage.setItem('hinowa_history', JSON.stringify(history));
        if (tutorialStep >= TUTORIAL_DONE_STEP) {
            localStorage.setItem('hinowa_intro_done', 'true');
        }
    }, [guideMode, result, history, tutorialStep]);

    useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);

    const apiKey = "";

    // --- 4. Derived States ---
    const isShukuDay = useMemo(() => { const now = new Date(); return now.getMonth() === 0 && now.getDate() === 1; }, []);
    const currentStage = useMemo(() => HIBIKI_STAGES.find((s) => result.FAS <= s.threshold) || HIBIKI_STAGES[HIBIKI_STAGES.length - 1], [result.FAS]);
    const tunnelSpeed = useMemo(() => (isDiving || tutorialStep === 2) ? 0.3 : 2 + 130 * Math.pow(1 - result.FAS, 2), [result.FAS, isDiving, tutorialStep]);

    const worldSync = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        return { lunarAge: "2.0", saturation: 100 - (Math.abs(hour - 12) / 12 * 50), brightness: 100 - (Math.abs(hour - 12) / 12 * 30), opacity: 0.1 };
    }, []);

    const theme = useMemo(() => {
        const guide = GUIDE_CONFIG[guideMode] || GUIDE_CONFIG.MIRROR;
        return { accent: isShukuDay ? '#fbbf24' : guide.color, bg: '#01050d', filter: `saturate(${worldSync.saturation}%) brightness(${worldSync.brightness}%)` };
    }, [guideMode, worldSync, isShukuDay]);

    const whisperContent = useMemo(() => {
        if (tutorialStep >= TUTORIAL_DONE_STEP) return result.summary || '隣にいるよ。';
        if (isProcessing || tutorialStep === 2) return "受け取ったよ。その想い、大切に預かるね";
        if (result.summary && tutorialStep === 3) return result.summary + "\n\n少しだけ、この鏡について話させて。";
        if (tutorialStep === 0) return "まずは、縁（えにし）を結びましょう。";
        if (tutorialStep === 1) return "準備は整いました。STARTを押して、あなたの旅を始めましょう。";
        return isShukuDay ? result.summary : '隣にいるよ。左の欄に、今の気持ちを書いてみて。';
    }, [tutorialStep, result.summary, isProcessing, isShukuDay]);

    const menuGuideText = useMemo(() => {
        if (!showGuideDelayed || tutorialStep >= 11) return "";
        if (tutorialStep === 6) return "ここは「跡」。\n過去のあなたの言葉が、航跡として記録されます。";
        if (tutorialStep === 7) return "ここは「調」。\n今のあなたの状態に合わせて、表示を調律します。";
        if (tutorialStep === 8) return "ここは「響」。\n今の心がどの景色を吸っているか、メタファーで映し出します。";
        if (tutorialStep === 9) return "ここは「Sub Systems」。\n世界の根源。導きの手や環境を定めます。";
        if (tutorialStep === 10) return "全てのシステム確認が完了しました。\nメニューを閉じて、鏡へお戻りください。";
        return "";
    }, [tutorialStep, showGuideDelayed]);

    // --- 5. Waveform & Logic ---
    const getResonancePath = () => {
        const points = 180, size = 1000, center = size / 2;
        let path = "";
        const modeConfig = GUIDE_CONFIG[guideMode] || GUIDE_CONFIG.MIRROR;
        let showWave = true;
        if (modeConfig.visualType === "SILENCE") showWave = false;
        if (modeConfig.visualType === "BURST_ONLY" && result.FAS < 0.6) showWave = false;
        if (!showWave) return "";

        if (isProcessing) {
            const startTime = processingStartTime.current || Date.now();
            const elapsed = (Date.now() - startTime) / 1000;
            const amplitude = Math.max(0, 800 * Math.exp(-0.6 * elapsed));
            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const x = t * size;
                const y = center + amplitude * Math.sin(8 * t * Math.PI + waveformTime * 0.1);
                path += (i === 0 ? "M" : "L") + `${x},${y}`;
            }
        } else {
            const pConfig = PERSONA_CONFIG[enPersona] || PERSONA_CONFIG.KENJA;
            const { a, b } = pConfig.waveRatio;
            const fasFactor = (result.FAS - 0.1) / 0.9;
            const amplitude = 400 + 500 * fasFactor;
            for (let i = 0; i <= points; i++) {
                const t = (i / points) * Math.PI * 2;
                const x = center + amplitude * Math.sin(a * t + waveformTime * 0.015);
                const y = center + amplitude * Math.sin(b * t + waveformTime * 0.01);
                path += (i === 0 ? "M" : "L") + `${x},${y}`;
            }
        }
        return path;
    };

    const fetchGemini = async (prompt, sys = "") => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: sys }] } })
            });
            if (!response.ok) return null;
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return typeof text === 'string' ? text : '';
        } catch (err) { return null; }
    };

    const processAnalysis = () => {
        if (!inputText.trim() || isShukuDay) return;
        setIsProcessing(true);
        processingStartTime.current = Date.now();

        if (tutorialStepRef.current <= 1) {
            setTutorialStep(2);
        }

        setIsBursting(true); setThermalGlow(1);

        setTimeout(() => {
            let negMatches = inputText.match(SCAN_PATTERNS.neg) || [];
            let posMatches = inputText.match(SCAN_PATTERNS.pos) || [];
            if (posMatches.length > 0 && negMatches.length === 0) consecutivePosStats.current += 1;
            else if (negMatches.length > 0) consecutivePosStats.current = 0;

            const guideSensitivity = GUIDE_CONFIG[guideMode]?.sensitivity || 0.5;
            const prevFAS = history.length > 0 ? history[history.length - 1].fas : 0.3;
            const rawCore = 0.35 + (negMatches.length * 0.65) - (posMatches.length * 0.55 * (1.0 + consecutivePosStats.current * 0.1));
            const currentFAS = Math.max(0.100, Math.min(0.999, guideSensitivity * prevFAS + (1 - guideSensitivity) * rawCore));

            setHistory(prev => [...prev.slice(-49), { fas: currentFAS, level: currentFAS >= 0.85 ? 'critical' : 'normal', timestamp: Date.now(), text: inputText, persona: guideMode }]);
            setResult(prev => ({ ...prev, FAS: currentFAS, level: currentFAS >= 0.85 ? 'critical' : 'normal', summary: "" }));
            setIsProcessing(false); setIsBursting(false);

            const sys = `あなたは灯輪。${GUIDE_CONFIG[guideMode]?.system || "冷静に。"} 「FAS」等の用語は禁止。`;
            fetchGemini(`想い: ${inputText}`, sys).then(res => {
                if (res) {
                    setResult(prev => ({ ...prev, summary: res }));
                    if (tutorialStepRef.current === 2) {
                        setTutorialStep(3);
                    }
                }
            });
        }, 1500);
    };

    const handleDiveTransition = (targetView) => {
        setIsDiving(true);
        setTimeout(() => {
            if (tutorialStep === 5 && targetView === 'MENU') setTutorialStep(6);
            setCurrentView(targetView);
            setIsDiving(false);
        }, 450);
    };

    // 🔊 Audio Fix: Robust Initialization & Gain
    const toggleAudio = async () => {
        try {
            if (!audioCtx.current) {
                audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            const ctx = audioCtx.current;
            // ユーザーアクション内で確実にresumeを呼ぶ
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            if (audioStatus === 'on') {
                droneOscs.current.forEach(({ osc, g }) => {
                    try {
                        g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
                        setTimeout(() => { osc.stop(); osc.disconnect(); }, 150);
                    } catch (e) { }
                });
                droneOscs.current = [];
                setAudioStatus('off');
            } else {
                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(0.5, ctx.currentTime); // Gain Increase
                masterGain.connect(ctx.destination);
                mainGain.current = masterGain;

                const guideConf = GUIDE_CONFIG[guideMode] || GUIDE_CONFIG.MIRROR;
                const baseFreq = guideConf.audio.base;
                const type = guideConf.audio.type || 'sine';

                droneOscs.current = [1, 1.5, 2.0].map((ratio, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(baseFreq * ratio, ctx.currentTime);
                    const vol = (0.2 / (i + 1)) + (guideConf.audio.gain * 0.5);
                    g.gain.setValueAtTime(0, ctx.currentTime);
                    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.0);
                    osc.connect(g); g.connect(masterGain); osc.start();
                    return { osc, g };
                });
                setAudioStatus('on');
            }
        } catch (e) { console.error(e); setAudioStatus('off'); }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setWaveformTime(t => t + 1);
            setRotation(r => (r + (isBursting ? 15 : 0.3)) % 360);
        }, 30);
        return () => clearInterval(timer);
    }, [isBursting]);

    useEffect(() => {
        if (audioStatus === 'on' && audioCtx.current && droneOscs.current.length > 0) {
            const guideConf = GUIDE_CONFIG[guideMode] || GUIDE_CONFIG.MIRROR;
            const baseFreq = guideConf.audio.base;
            const now = audioCtx.current.currentTime;
            droneOscs.current.forEach(({ osc }, i) => {
                const ratio = [1, 1.5, 2.0][i] || 1;
                osc.frequency.setTargetAtTime(baseFreq * ratio + (result.FAS * 30 * (i + 1)), now, 0.5);
            });
        }
    }, [guideMode, result.FAS, audioStatus]);

    useEffect(() => {
        if (tutorialStep >= 6 && tutorialStep <= 10) {
            setShowGuideDelayed(false);
            const timer = setTimeout(() => setShowGuideDelayed(true), 500);
            return () => clearTimeout(timer);
        }
    }, [tutorialStep]);

    useEffect(() => {
        let timer;
        if (tutorialStep === 3) {
            timer = setTimeout(() => setTutorialStep(4), 4000);
        } else if (tutorialStep === 4) {
            timer = setTimeout(() => setTutorialStep(5), 15000);
        } else if (tutorialStep === 11) {
            timer = setTimeout(() => setTutorialStep(TUTORIAL_DONE_STEP), 5000);
        }
        return () => clearTimeout(timer);
    }, [tutorialStep]);

    // 🛡️ 完了時にUIを表示(PureMode解除)
    useEffect(() => {
        if (tutorialStep === TUTORIAL_DONE_STEP) {
            setIsPureMode(false);
        }
    }, [tutorialStep]);

    const handleClearMemory = () => {
        if (!isClearConfirming) { setIsClearConfirming(true); return; }
        localStorage.clear();
        setHistory([{ fas: 0.300, level: 'low', timestamp: Date.now(), text: "同期開始。", persona: 'MIRROR' }]);
        setResult({ FAS: 0.300, level: 'low', summary: 'おかえり。続きを話そうか。' });
        setTutorialStep(0);
        setIsClearConfirming(false);
        setCurrentView('鏡');
    };

    const handleSkip = () => {
        if (tutorialStep < TUTORIAL_DONE_STEP) {
            if (tutorialStep === 10) {
                setTutorialStep(11);
                setCurrentView('鏡');
            } else {
                setTutorialStep(prev => prev + 1);
                if (tutorialStep === 5) setCurrentView('MENU');
                if (tutorialStep === 8) setCurrentView('SUB_MENU');
            }
        }
    };

    // --- 6. Render ---
    return (
        <div className={`min-h-screen overflow-hidden relative bg-[#010204] ${result.FAS >= 0.85 ? 'critical-distortion' : ''}`}
            style={{ color: theme.accent, fontSize: `${fontSize}px`, caretColor: theme.accent }} onDoubleClick={() => setIsPureMode(!isPureMode)}>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {currentView === '鏡' && [...Array(currentStage.dustCount || 5)].map((_, i) => (
                    <div key={i} className={`absolute w-1 h-1 bg-white/30 rounded-full animate-material-dust`}
                        style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDuration: '30s', animationDelay: `${Math.random() * -20}s`, boxShadow: `0 0 6px ${theme.accent}44` }}></div>
                ))}
            </div>
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-[15000ms] ${thermalGlow > 0 ? 'opacity-30 scale-150' : 'opacity-0 scale-100'}`} style={{ background: `radial-gradient(circle at center, ${theme.accent} 0%, transparent 60%)`, filter: 'blur(60px)' }}></div>
            <div className={`fixed inset-0 z-[6000] pointer-events-none flex items-center justify-center transition-all ${isDiving ? 'opacity-100' : 'opacity-0 duration-700 delay-300'}`}><div className={`bg-white rounded-full transition-transform duration-700 ease-in-out ${isDiving ? 'scale-[350]' : 'scale-0'}`} style={{ width: '10px', height: '10px' }}></div></div>

            {tutorialStep === 0 && (
                <div className="fixed inset-0 z-[8000] bg-black/95 flex flex-col items-center justify-center p-6 text-center space-y-16">
                    <div className="space-y-6">
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-widest text-serif animate-thermal-in">私は今日、誰として<br />あなたの隣にいればいい？</h1>
                        <p className="text-white/40 text-sm tracking-[0.3em] uppercase text-serif">Initial Resonance Setup</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.values(GUIDE_CONFIG).map((g) => (
                            <button key={g.id} onClick={() => { setGuideMode(g.id); setTutorialStep(1); toggleAudio(); }}
                                className="p-10 rounded-[3rem] border border-white/10 bg-white/[0.03] hover:scale-105 transition-all flex flex-col items-center gap-6 group relative"
                                style={{ '--hover-color': g.color }}>
                                <div className="p-6 rounded-full bg-white/5" style={{ color: g.color }}>{g.icon}</div>
                                <h3 className="text-2xl font-black text-white text-serif">{g.label}</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest text-serif">{g.sub}</p>
                                <div className="absolute top-full mt-4 p-4 bg-black/90 border border-white/20 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 text-left leading-relaxed">
                                    {g.tooltip}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 🚀 Skip Button (Lower Position) */}
            {tutorialStep >= 1 && tutorialStep < TUTORIAL_DONE_STEP && (
                <button onClick={handleSkip} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9000] flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-black tracking-widest hover:bg-white/20 transition-all group">
                    <span>NEXT STEP</span> <FastForward size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {tutorialStep === 11 && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/95 backdrop-blur-lg pointer-events-none animate-message-burst">
                    <div className="text-4xl md:text-7xl font-black text-white tracking-widest drop-shadow-[0_0_50px_rgba(255,255,255,0.4)] text-center px-6 text-serif">チュートリアル終了</div>
                </div>
            )}

            {/* Step 4 Explanation */}
            {tutorialStep === 4 && (
                <div className="fixed inset-x-0 top-32 z-[4000] flex justify-center pointer-events-none px-12">
                    <div className="max-w-3xl text-center text-white">
                        <h2 className="text-white text-3xl md:text-5xl font-black mb-12 animate-thermal-in tracking-widest drop-shadow-xl text-serif">{EXPLANATIONS.fas.title}</h2>
                        <div className="text-white/80 text-xl md:text-2xl leading-relaxed italic font-medium animate-thermal-in whitespace-pre-wrap tracking-wide drop-shadow-lg text-serif">{EXPLANATIONS.fas.body}</div>
                    </div>
                    <div className="fixed bottom-32 inset-x-0 text-center z-[5000] animate-thermal-in">
                        <div className="text-8xl font-black text-white/50 tracking-tighter" style={{ textShadow: `0 0 20px ${theme.accent}` }}>{result.FAS.toFixed(3)}</div>
                        <div className="text-xs uppercase tracking-[0.5em] text-white/30 mt-4">Current Mental Mass</div>
                    </div>
                </div>
            )}

            {currentView === '鏡' && (
                <div className={`fixed inset-0 transition-all duration-1000 flex items-center justify-center`}>
                    <div className="relative w-full h-full pointer-events-auto flex items-center justify-center overflow-hidden">
                        {/* 📝 修正: Step 4のみ透明、それ以外は表示 */}
                        {!isPureMode && (
                            <aside className={`absolute left-12 z-40 p-10 bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl transition-all duration-1000 ${tutorialStep === 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ width: `${panelWidth - 6}rem` }}>
                                <div className="flex items-center gap-4 mb-8 text-white font-black tracking-widest uppercase">
                                    <MessageSquare size={18} style={{ color: theme.accent }} /> <span style={{ color: theme.accent }}>想いを置いて</span>
                                </div>
                                <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onDoubleClick={(e) => e.stopPropagation()} className="w-full bg-transparent border-none focus:outline-none text-white resize-none h-64 persona-scrollbar" placeholder="..." disabled={isShukuDay} />
                                {!isShukuDay && <button onClick={processAnalysis} onDoubleClick={(e) => e.stopPropagation()} disabled={isProcessing || !inputText.trim()} className="w-full mt-10 py-7 rounded-[2.5rem] font-black tracking-widest transition-all" style={{ backgroundColor: theme.accent, color: '#000' }}>{isProcessing ? 'Syncing...' : 'START'}</button>}
                            </aside>
                        )}

                        <main className="relative w-full h-full flex items-center justify-center cursor-pointer select-none overflow-hidden" onDoubleClick={() => setIsPureMode(!isPureMode)}>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="absolute border border-white/10 rounded-full orbit-dynamic" style={{ width: `${550 + i * 120}px`, height: `${550 + i * 120}px`, borderTopColor: i % 2 === 0 ? theme.accent : 'transparent', transform: `rotate(${rotation * (1 + i * 0.1)}deg)`, opacity: 0.15 }}></div>
                                ))}
                                <svg width="250%" height="250%" viewBox="0 0 1000 1000" className="absolute inset-[-75%] opacity-40" style={{ filter: `drop-shadow(0 0 30px ${theme.accent})`, transform: `rotate(${rotation * 0.1}deg)` }}>
                                    <path d={getResonancePath()} fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" className="transition-all duration-1000" />
                                    <path d={getResonancePath()} fill="none" stroke={theme.accent} strokeWidth="1" strokeLinecap="round" className="transition-all duration-1000 opacity-30" style={{ transform: 'translate(20px, 20px)' }} />
                                </svg>
                                <div className={`transition-opacity duration-1000 ${tutorialStep === 4 ? 'opacity-0' : 'opacity-100'}`}>
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className={`absolute rounded-full border border-white/5 animate-tunnel-in`} style={{ width: `${200 + i * 150}px`, height: `${200 + i * 150}px`, animationDelay: `${i * -1.5}s`, animationDuration: `${tunnelSpeed}s`, boxShadow: `0 0 50px ${theme.accent}${Math.floor(20 - i)}`, opacity: 0.2, "--min-scale": result.FAS < 0.5 ? `${0.01 + result.FAS * 0.1}` : '1.8' }}></div>
                                    ))}
                                </div>
                            </div>

                            <div className={`absolute inset-0 flex items-center justify-center z-10`}><div className={`w-[480px] h-[480px] rounded-full bg-white/[0.04] animate-adaptive-breathing`} style={{ boxShadow: isShukuDay ? `0 0 180px rgba(251, 191, 36, 0.5)` : `0 0 ${130 + (typingLuminance * 130)}px ${theme.accent}${Math.floor(20 + typingLuminance * 40)}`, animationDuration: `${breathDuration}s`, filter: `blur(${18 - typingLuminance * 14}px)` }}></div></div>

                            <div className={`absolute z-50 inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-1000 ${isBursting ? 'scale-125' : 'scale-100'} ${tutorialStep === 4 ? 'opacity-0' : 'opacity-100'}`}>
                                <div className="text-[150px] md:text-[220px] font-black text-white leading-none" style={{ textShadow: '0 0 40px rgba(0,0,0,0.8)' }}>{result.FAS.toFixed(3)}</div>
                                <div className="mt-14 text-[11px] font-black px-12 py-3.5 tracking-widest rounded-full border border-white/10 bg-white/5 uppercase">{(result.level || 'NORMAL')}</div>
                            </div>
                        </main>

                        {/* 📝 修正: ささやき欄も同様に制御 */}
                        {!isPureMode && (
                            <section className={`absolute right-12 z-40 p-14 bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[3.5rem] shadow-2xl transition-all duration-1000 ${tutorialStep === 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ width: `${panelWidth}rem` }}>
                                <div className="flex items-center gap-4 mb-10 opacity-30 text-white"><Heart size={24} style={{ color: theme.accent }} /><span className="text-[11px] font-black uppercase tracking-widest">灯輪のささやき</span></div>
                                <div className="leading-relaxed text-white/95 min-h-[240px] border-l-2 border-white/20 pl-10 italic text-serif whitespace-pre-wrap animate-thermal-in">{whisperContent}</div>
                            </section>
                        )}
                    </div>
                </div>
            )}

            {/* 🚀 Menu Button */}
            {!isPureMode && currentView === '鏡' && tutorialStep >= 1 && (
                <header className="fixed top-0 w-full p-10 flex justify-between items-center z-[9000]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleDiveTransition('MENU')} className={`w-14 h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl ${tutorialStep === 5 ? 'shadow-[0_0_30px_rgba(255,255,255,0.8)] border-white animate-pulse' : ''}`} style={{ '--ripple-color': theme.accent }}>
                            <Menu size={24} />
                        </button>
                    </div>
                    <div className="text-white/40 font-black uppercase tracking-widest text-[10px] bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                        {GUIDE_CONFIG[guideMode].label} Mode Synced
                    </div>
                </header>
            )}

            {currentView === 'MENU' && (
                <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[6000] flex items-center justify-center animate-in zoom-in duration-300">
                    <div className="max-w-4xl w-full text-center space-y-20">
                        {tutorialStep >= 6 && tutorialStep <= 10 && <div className="text-3xl font-bold text-white text-serif animate-in fade-in zoom-in duration-500">{menuGuideText}</div>}

                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 px-10 transition-opacity duration-500 ${tutorialStep === 10 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                            {[{ id: '鏡', en: 'Dashboard', icon: <Home size={32} />, step: null }, { id: '跡', en: 'History', icon: <HistoryIcon size={32} />, step: 6 }, { id: '調', en: 'Settings', icon: <SettingsIcon size={32} />, step: 7 }, { id: '響', en: 'Spectrum', icon: <Eye size={32} />, step: 8 }].map(item => (
                                <button key={item.id} onClick={() => { if (tutorialStep === item.step) handleDiveTransition(item.id); else if (tutorialStep >= 12) handleDiveTransition(item.id); }}
                                    className={`p-10 bg-white/[0.04] border border-white/10 rounded-[3.5rem] hover:bg-white/10 transition-all flex flex-col items-center ${tutorialStep === item.step ? 'animate-pulse-persona-box shadow-[0_0_30px_var(--accent)]' : ''}`} style={{ '--accent': theme.accent }}>
                                    <div className="p-6 bg-white/5 rounded-full mb-6" style={{ color: theme.accent }}>{item.icon}</div>
                                    <h3 className="text-2xl font-black text-white">{item.id}</h3>
                                    <p className="text-[10px] opacity-20 uppercase tracking-widest">{item.en}</p>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { if (tutorialStep === 9) handleDiveTransition('SUB_MENU'); else if (tutorialStep >= 12) handleDiveTransition('SUB_MENU'); }}
                            className={`px-10 py-5 bg-white/5 border border-white/10 rounded-full text-white/60 hover:text-white transition-all flex items-center gap-4 mx-auto uppercase tracking-widest text-xs ${tutorialStep === 9 ? 'animate-pulse-persona-box shadow-[0_0_30px_var(--accent)]' : ''} ${tutorialStep === 10 ? 'opacity-20 pointer-events-none' : ''}`} style={{ '--accent': theme.accent }}><Sliders size={18} /> Sub Systems</button>

                        <button onClick={() => {
                            if (tutorialStep === 10) { setTutorialStep(11); setCurrentView('鏡'); }
                            else setCurrentView('鏡');
                        }} className={`mt-12 uppercase tracking-widest text-[10px] transition-all ${tutorialStep === 10 ? 'text-white text-xl font-black animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.5)] border-b-2 border-white' : 'text-white/20 hover:text-white'}`}>Close Menu</button>
                    </div>
                </div>
            )}

            {currentView === '跡' && (
                <SubView title="跡 History" subtitle="過去の心の航跡" onBack={() => { if (tutorialStep === 6) setTutorialStep(7); handleDiveTransition('MENU'); }} onCloseStep={tutorialStep === 6 ? 7 : null} setTutorialStep={setTutorialStep} theme={theme}>
                    <div className="relative border-l-2 border-white/10 pl-8 ml-4 space-y-12">
                        {history.slice().reverse().map((h, i) => {
                            if (!h || !h.text) return null;
                            const guideInfo = GUIDE_CONFIG[h.persona] || GUIDE_CONFIG.MIRROR;
                            return (
                                <div key={i} className="relative group">
                                    <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-[#01050d] transition-transform group-hover:scale-125" style={{ backgroundColor: guideInfo.color, boxShadow: `0 0 15px ${guideInfo.color}` }}></div>
                                    <div className="bg-white/[0.03] backdrop-blur-sm p-8 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all hover:bg-white/[0.06] shadow-xl">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3 opacity-60">
                                                {guideInfo.icon}
                                                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: guideInfo.color }}>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="font-mono text-2xl font-black opacity-30">{h.fas.toFixed(3)}</div>
                                        </div>
                                        <p className="text-xl text-white/90 font-medium leading-relaxed italic text-serif mb-6">"{h.text}"</p>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full transition-all duration-1000" style={{ width: `${h.fas * 100}%`, backgroundColor: guideInfo.color }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SubView>
            )}

            {currentView === 'SUB_MENU' && (
                <SubView
                    title="Sub Systems"
                    subtitle="深層設定・環境"
                    onBack={() => { if (tutorialStep === 9) setTutorialStep(10); handleDiveTransition('MENU'); }}
                    onCloseStep={tutorialStep === 9 ? 10 : null}
                    setTutorialStep={setTutorialStep}
                    theme={theme}
                >
                    <div className="relative min-h-[400px] text-serif">
                        {tutorialStep === 9 && (<div className="mb-20 text-center animate-in fade-in duration-1000"><h2 className="text-white text-4xl font-black mb-10 tracking-widest">{EXPLANATIONS.sub.title}</h2><p className="text-white/80 text-2xl leading-relaxed italic whitespace-pre-wrap">{EXPLANATIONS.sub.body}</p></div>)}
                        <div className={`space-y-24 transition-all duration-1000 ${tutorialStep === 9 ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                            <section><div className="flex items-center gap-3 mb-10 opacity-40 text-white"><Compass size={18} /><span className="text-[11px] font-black uppercase tracking-[0.5em]">Guide Mode</span></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Object.values(GUIDE_CONFIG).map((g) => (<button key={g.id} onClick={() => setGuideMode(g.id)} onDoubleClick={(e) => e.stopPropagation()} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-3 relative group ${guideMode === g.id ? 'bg-white text-black scale-105 shadow-2xl' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`} style={{ borderColor: guideMode === g.id ? g.color : undefined }}><span className="text-2xl font-black">{g.label}</span><span className="text-[8px] font-bold uppercase tracking-widest">{g.sub}</span><div className="absolute bottom-full mb-4 p-4 bg-black/90 border border-white/20 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 text-left leading-relaxed z-50">{g.tooltip}</div></button>))}</div></section>
                            <section><div className="flex items-center gap-3 mb-10 opacity-40 text-white"><User size={18} /><span className="text-[11px] font-black uppercase tracking-[0.5em]">Resonance Persona</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Object.values(PERSONA_CONFIG).map((p) => (<button key={p.id} onClick={() => { setEnPersona(p.id); }} onDoubleClick={(e) => e.stopPropagation()} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-3 relative group ${enPersona === p.id ? 'bg-white text-black scale-105 shadow-2xl' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`} style={{ borderColor: enPersona === p.id ? p.color : undefined }}><span className="text-2xl font-black">{p.label}</span><span className="text-[8px] font-bold uppercase tracking-widest">{p.subtitle}</span><div className="absolute bottom-full mb-4 p-4 bg-black/90 border border-white/20 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-40 text-center leading-relaxed z-50">{p.tooltip}</div></button>))}</div></section>
                            <section><div className="flex items-center gap-3 mb-10 opacity-40 text-white"><Droplets size={18} /><span className="text-[11px] font-black uppercase tracking-[0.5em]">Core Environment</span></div><div className="grid grid-cols-2 gap-6"><button onClick={() => { setEnvMode('SEA'); }} onDoubleClick={(e) => e.stopPropagation()} className={`p-12 rounded-[3.5rem] border transition-all flex flex-col items-center gap-5 relative group ${envMode === 'SEA' ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-white/30'}`}><Sunrise size={40} /><span className="text-base font-black tracking-widest uppercase">Deep Sea</span><div className="absolute bottom-full mb-4 p-4 bg-black/90 border border-white/20 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 text-center leading-relaxed z-50">深い安らぎと沈静。</div></button><button onClick={() => { setEnvMode('SUN'); }} onDoubleClick={(e) => e.stopPropagation()} className={`p-12 rounded-[3.5rem] border transition-all flex flex-col items-center gap-5 relative group ${envMode === 'SUN' ? 'bg-amber-500 border-amber-300 text-black shadow-xl' : 'bg-white/5 border-white/5 text-white/30'}`}><Sun size={40} /><span className="text-base font-black tracking-widest uppercase">Warm Sun</span><div className="absolute bottom-full mb-4 p-4 bg-black/90 border border-white/20 rounded-xl text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 text-center leading-relaxed z-50">温かな活力と希望。</div></button></div></section>
                            <section className="flex justify-center gap-8 pt-20 border-t border-white/5">
                                <button onClick={() => { setTutorialStep(0); setInputText(''); setResult({ FAS: 0.100, level: 'low', summary: '' }); setCurrentView('鏡'); localStorage.removeItem('hinowa_intro_done'); }} onDoubleClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-8 py-3 rounded-full bg-white/5 text-white/40 hover:text-white transition-all text-xs font-black uppercase tracking-[0.3em]"><BookOpen size={16} /> 再チュートリアル</button>
                                <button onClick={handleClearMemory} onDoubleClick={(e) => e.stopPropagation()} className={`flex items-center gap-3 px-8 py-3 rounded-full transition-all text-xs font-black uppercase tracking-[0.3em] ${isClearConfirming ? 'bg-red-900/50 text-red-200 border border-red-500 animate-pulse' : 'bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10'}`}>
                                    {isClearConfirming ? <AlertTriangle size={16} /> : <Trash2 size={16} />}
                                    {isClearConfirming ? "本当に消しますか？" : "記憶の消去"}
                                </button>
                            </section>
                        </div>
                    </div>
                </SubView>
            )}

            {currentView === '調' && (
                <SubView title="調 Settings" subtitle="共鳴と物理の調整" onBack={() => { if (tutorialStep === 7) setTutorialStep(8); handleDiveTransition('MENU'); }} onCloseStep={tutorialStep === 7 ? 8 : null} setTutorialStep={setTutorialStep} theme={theme}>
                    <div className="space-y-12 text-white text-serif"><section className="p-12 bg-white/[0.05] border border-white/10 rounded-[4rem] shadow-2xl"><h3 className="font-bold text-xl mb-12 flex items-center gap-3 opacity-60 italic"><Target /> 解析感度 Sensitivity</h3><input type="range" min="0.1" max="0.9" step="0.01" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="w-full h-2.5 bg-white/10 rounded-full appearance-none accent-white cursor-pointer persona-slider" style={{ '--accent-color': theme.accent }} /></section><section className="p-12 bg-white/[0.05] border border-white/10 rounded-[4rem] shadow-2xl"><h3 className="font-bold text-xl mb-12 flex items-center gap-3 opacity-60 italic"><Type /> 文字の大きさ Text Size</h3><input type="range" min="16" max="32" step="1" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full h-2.5 bg-white/10 rounded-full appearance-none accent-white cursor-pointer persona-slider" style={{ '--accent-color': theme.accent }} /></section><section className="p-12 bg-white/[0.05] border border-white/10 rounded-[4rem] shadow-2xl"><h3 className="font-bold text-xl mb-12 flex items-center gap-3 opacity-60 italic"><Maximize /> 枠の大きさ Panel Width</h3><input type="range" min="22" max="44" step="1" value={panelWidth} onChange={(e) => setPanelWidth(parseInt(e.target.value))} className="w-full h-2.5 bg-white/10 rounded-full appearance-none accent-white cursor-pointer persona-slider" style={{ '--accent-color': theme.accent }} /></section></div>
                </SubView>
            )}

            {/* 🌟 響 (Spectrum) - Romaji & Bottom Button */}
            {currentView === '響' && (
                <SubView title="響 Spectrum" subtitle="現在の心象風景" onBack={() => { if (tutorialStep === 8) setTutorialStep(9); handleDiveTransition('MENU'); }} onCloseStep={tutorialStep === 8 ? 9 : null} setTutorialStep={setTutorialStep} theme={theme}>
                    <div className="relative min-h-[600px] flex flex-col items-center justify-center text-center space-y-16 text-white overflow-hidden">

                        {/* 💎 Core */}
                        <div className="relative w-96 h-96 flex items-center justify-center">
                            <div className={`absolute inset-0 rounded-full blur-[100px] opacity-40 transition-all duration-3000`} style={{ backgroundColor: currentStage.color }}></div>
                            <div className="absolute w-[120%] h-[120%] border border-white/10 rounded-full animate-slow-rotate" style={{ borderStyle: 'dashed' }}></div>
                            <div className="absolute w-[140%] h-[140%] border border-white/5 rounded-full animate-slow-rotate" style={{ animationDirection: 'reverse', animationDuration: '40s' }}></div>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="absolute inset-0 border border-white/30"
                                    style={{
                                        transform: `rotate(${i * 72 + rotation}deg) scale(${0.5 + (result.FAS * 0.8)})`,
                                        borderRadius: i % 2 === 0 ? '50%' : '0%',
                                        transition: 'all 0.5s ease-out',
                                        filter: `blur(${i}px)`,
                                        mixBlendMode: 'overlay'
                                    }}></div>
                            ))}
                            <div className="absolute z-20 text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)] transform scale-150">{currentStage.icon}</div>
                        </div>

                        {/* 🌌 Romaji Typography */}
                        <div className="relative z-10 flex flex-col items-center gap-6 mt-10">
                            <h3 className="text-8xl font-black text-white text-serif tracking-widest uppercase"
                                style={{ textShadow: `0 0 40px ${currentStage.color}, 0 0 80px ${currentStage.color}` }}>
                                {currentStage.en}
                            </h3>
                            <p className="text-xs tracking-[1em] uppercase opacity-50">{currentStage.title}</p>
                        </div>
                    </div>
                </SubView>
            )}

            <button
                onClick={toggleAudio}
                className={`fixed bottom-8 right-8 z-[9000] p-4 rounded-full backdrop-blur-md border transition-all duration-500 group ${audioStatus === 'on' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent text-white/30 hover:bg-white/5'}`}
                title={audioStatus === 'on' ? "音を止める" : "音を鳴らす"}
                onDoubleClick={(e) => e.stopPropagation()}
            >
                {audioStatus === 'on' ? <Volume2 size={24} /> : <VolumeX size={24} />}
                <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 text-xs font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {audioStatus === 'on' ? "MUTE" : "SOUND ON"}
                </span>
            </button>

            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;700;900&display=swap');
        body { background-color: #010204; font-family: 'Zen Old Mincho', serif; letter-spacing: 0.05em; }
        .text-serif { font-family: 'Zen Old Mincho', serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .persona-slider::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; background: var(--accent-color); border-radius: 50%; cursor: pointer; border: 4px solid #000; box-shadow: 0 0 15px var(--accent-color); }
        @keyframes message-burst { 0% { transform: scale(0.85); opacity: 0; filter: blur(10px); } 15% { transform: scale(1); opacity: 1; filter: blur(0px); } 80% { transform: scale(1.02); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; filter: blur(40px); } }
        .animate-message-burst { animation: message-burst 5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        @keyframes thermal-in { 0% { opacity: 0; filter: blur(20px); transform: translateY(10px); } 100% { opacity: 1; filter: blur(0px); transform: translateY(0); } }
        .animate-thermal-in { animation: thermal-in 2.2s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .hibiki-nagi { background: linear-gradient(180deg, #020617 0%, #0c1a3b 100%); }
        .critical-distortion { animation: chromatic-jitter 0.2s infinite; }
        @keyframes chromatic-jitter { 0% { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; } 50% { text-shadow: -2px 0 #ff0000, 2px 0 #00ffff; } 100% { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; } }
        .animate-pulse-persona-box { animation: pulse-persona-box 1.2s infinite ease-in-out; }
        @keyframes pulse-persona-box { 0%, 100% { transform: translate3d(0,0,0) scale(1); border-color: rgba(255,255,255,0.1); } 50% { transform: translate3d(0,0,0) scale(1.03); border-color: var(--accent); } }
        @keyframes pulse-persona-intense { 0%, 100% { transform: translate3d(0,0,0) scale(1); box-shadow: 0 0 0 0 var(--ripple-color); } 50% { transform: translate3d(0,0,0) scale(1.1); box-shadow: 0 0 50px var(--ripple-color); } }
        .animate-pulse-persona-intense { animation: pulse-persona-intense 1s infinite ease-in-out; }
        @keyframes slow-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-slow-rotate { animation: slow-rotate 20s linear infinite; }
        @keyframes tunnel-in { 0% { transform: scale(1.5); opacity: 0; } 100% { transform: scale(var(--min-scale)); opacity: 1; } }
        .animate-tunnel-in { animation: tunnel-in infinite linear; }
        @keyframes adaptive-breathing { 0% { transform: scale(0.85); opacity: 0.05; } 40% { transform: scale(1.15); opacity: 0.25; } 100% { transform: scale(0.85); opacity: 0.05; } }
        .animate-adaptive-breathing { animation: adaptive-breathing infinite ease-in-out; }
      `}} />
        </div>
    );
};

export default App;
