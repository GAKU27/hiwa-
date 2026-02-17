import React, { useState, useMemo } from 'react';
import { MODES, WEATHERS } from '../lib/emotionEngine';
import { isApiAvailable } from '../lib/geminiClient';
import { getHistory } from '../lib/emotionHistory';
import { Sparkles, ChevronRight, Palette, Star } from 'lucide-react';

// モード別テーマ定義
const MODE_THEMES = {
    TOMOSHIBI: {
        accent: '#f59e0b',
        accentRgb: '245,158,11',
        bgGrad: 'radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.06) 0%, transparent 60%)',
        borderActive: 'rgba(245,158,11,0.4)',
        glowShadow: '0 0 30px rgba(245,158,11,0.15)',
        buttonBg: 'rgba(245,158,11,0.08)',
        buttonBorder: 'rgba(245,158,11,0.25)',
        buttonHover: 'rgba(245,158,11,0.15)',
        tagline: '温かい光が、あなたを待っています。',
    },
    RAIMEI: {
        accent: '#8b5cf6',
        accentRgb: '139,92,246',
        bgGrad: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, transparent 60%)',
        borderActive: 'rgba(139,92,246,0.4)',
        glowShadow: '0 0 30px rgba(139,92,246,0.15)',
        buttonBg: 'rgba(139,92,246,0.08)',
        buttonBorder: 'rgba(139,92,246,0.25)',
        buttonHover: 'rgba(139,92,246,0.15)',
        tagline: '言葉にしろ。ここにいる。',
    },
    TENBIN: {
        accent: '#64748b',
        accentRgb: '100,116,139',
        bgGrad: 'radial-gradient(ellipse at 50% 30%, rgba(100,116,139,0.06) 0%, transparent 60%)',
        borderActive: 'rgba(100,116,139,0.4)',
        glowShadow: '0 0 30px rgba(100,116,139,0.15)',
        buttonBg: 'rgba(100,116,139,0.08)',
        buttonBorder: 'rgba(100,116,139,0.25)',
        buttonHover: 'rgba(100,116,139,0.15)',
        tagline: '……観測を開始します。',
    },
};

const SettingScreen = ({ onStart, onConstellation }) => {
    const [selectedMode, setSelectedMode] = useState('TOMOSHIBI');
    const [selectedColor, setSelectedColor] = useState('#4a5568');
    const [selectedWeather, setSelectedWeather] = useState('cloudy');

    const apiAvailable = useMemo(() => isApiAvailable(), []);
    const theme = MODE_THEMES[selectedMode];

    const handleStart = () => {
        onStart({
            mode: selectedMode,
            color: selectedColor,
            weather: selectedWeather,
        });
    };

    // モード + 色で変化する背景
    const bgStyle = useMemo(() => {
        const hex = selectedColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return {
            background: `
                ${MODE_THEMES[selectedMode].bgGrad},
                radial-gradient(ellipse at 50% 80%, rgba(${r},${g},${b},0.12) 0%, transparent 60%),
                linear-gradient(180deg, rgba(8,8,12,1) 0%, rgba(10,10,16,1) 100%)
            `,
            transition: 'background 1.2s ease',
        };
    }, [selectedColor, selectedMode]);

    const currentMode = MODES[selectedMode];

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
            style={bgStyle}
        >
            {/* Header */}
            <div className="text-center mb-12 animate-fade-in">
                <h1
                    className="text-4xl md:text-5xl font-extralight tracking-[0.25em] mb-3 transition-colors duration-700"
                    style={{ color: `${theme.accent}dd` }}
                >
                    灯輪
                </h1>
                <p className="text-xs md:text-sm text-white/50 tracking-widest font-light">
                    HIWA — Emotional Dialogue Engine
                </p>
                {!apiAvailable && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Sparkles size={12} className="text-amber-400" />
                        <span className="text-xs text-amber-400/80">モックモード（APIキー未設定）</span>
                    </div>
                )}
            </div>

            {/* Mode Selection */}
            <div className="w-full max-w-lg mb-10 animate-fade-in-delay-1">
                <p className="text-xs text-white/50 tracking-widest mb-4 text-center uppercase">Mode — 意思</p>
                <div className="grid grid-cols-3 gap-3">
                    {Object.values(MODES).map((mode) => {
                        const modeTheme = MODE_THEMES[mode.id];
                        const isSelected = selectedMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`group relative p-4 rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden ${isSelected
                                        ? 'shadow-lg'
                                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                                    }`}
                                style={isSelected ? {
                                    borderColor: modeTheme.borderActive,
                                    backgroundColor: modeTheme.buttonBg,
                                    boxShadow: modeTheme.glowShadow,
                                } : {}}
                            >
                                <div className="text-2xl mb-2">{mode.icon}</div>
                                <div
                                    className="text-sm font-light tracking-wider transition-colors duration-500"
                                    style={{ color: isSelected ? `${modeTheme.accent}ee` : 'rgba(255,255,255,0.85)' }}
                                >
                                    {mode.label}
                                </div>
                                <div className="text-[10px] text-white/50 mt-1">{mode.sub}</div>
                                {/* モード固有のアクセントライン */}
                                {isSelected && (
                                    <div
                                        className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full transition-all duration-500"
                                        style={{ backgroundColor: modeTheme.accent, opacity: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
                {/* モード説明 — モードカラーで表示 */}
                <p
                    className="text-[11px] text-center mt-3 font-light transition-colors duration-500"
                    style={{ color: `${theme.accent}99` }}
                >
                    {currentMode.description}
                </p>
            </div>

            {/* Color Picker */}
            <div className="w-full max-w-lg mb-10 animate-fade-in-delay-2">
                <p className="text-xs text-white/50 tracking-widest mb-4 text-center uppercase">Color — 直感</p>
                <div className="flex items-center justify-center gap-6">
                    <div className="relative group">
                        <input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-20 h-20 rounded-full cursor-pointer appearance-none border-2 border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                            style={{ filter: 'drop-shadow(0 0 20px ' + selectedColor + '40)' }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                            <Palette size={12} className="text-white/60" />
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-white/80 text-sm font-mono tracking-wider">{selectedColor.toUpperCase()}</p>
                        <p className="text-white/50 text-[10px] mt-1">心に浮かぶ色を選んでください</p>
                    </div>
                </div>
            </div>

            {/* Weather Selection */}
            <div className="w-full max-w-lg mb-12 animate-fade-in-delay-3">
                <p className="text-xs text-white/50 tracking-widest mb-4 text-center uppercase">Weather — 環境</p>
                <div className="flex justify-center gap-2">
                    {WEATHERS.map((weather) => (
                        <button
                            key={weather.id}
                            onClick={() => setSelectedWeather(weather.id)}
                            className={`px-4 py-3 rounded-xl border transition-all duration-300 cursor-pointer ${selectedWeather === weather.id
                                    ? 'border-white/20 bg-white/[0.08]'
                                    : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
                                }`}
                            style={selectedWeather === weather.id ? {
                                borderColor: `${theme.accent}40`,
                                boxShadow: `0 0 12px ${theme.accent}15`,
                            } : {}}
                        >
                            <div className="text-lg mb-1">{weather.icon}</div>
                            <div className="text-[10px] text-white/60">{weather.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Start Button — モードカラーで変化 */}
            <button
                onClick={handleStart}
                className="group flex items-center gap-3 px-8 py-4 rounded-full transition-all duration-500 animate-fade-in-delay-4 cursor-pointer"
                style={{
                    border: `1px solid ${theme.accent}30`,
                    backgroundColor: theme.buttonBg,
                    boxShadow: `0 0 20px ${theme.accent}10`,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.buttonHover;
                    e.currentTarget.style.borderColor = `${theme.accent}50`;
                    e.currentTarget.style.boxShadow = `0 0 30px ${theme.accent}20`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.buttonBg;
                    e.currentTarget.style.borderColor = `${theme.accent}30`;
                    e.currentTarget.style.boxShadow = `0 0 20px ${theme.accent}10`;
                }}
            >
                <span
                    className="text-sm tracking-[0.15em] font-light transition-colors duration-300"
                    style={{ color: `${theme.accent}dd` }}
                >
                    対話を始める
                </span>
                <ChevronRight size={16} style={{ color: `${theme.accent}99` }} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {/* モード別のタグライン */}
            <p
                className="mt-4 text-[10px] font-light tracking-wider transition-all duration-700 animate-fade-in-delay-4"
                style={{ color: `${theme.accent}60` }}
            >
                {theme.tagline}
            </p>

            {/* 星座ビューへのリンク */}
            {onConstellation && (
                <button
                    onClick={onConstellation}
                    className="mt-6 flex items-center gap-2 text-white/40 hover:text-white/65 transition-colors cursor-pointer animate-fade-in-delay-4"
                >
                    <Star size={12} />
                    <span className="text-[11px] tracking-wider font-light">
                        星座を見る{getHistory().length > 0 ? ` (${getHistory().length})` : ''}
                    </span>
                </button>
            )}
        </div>
    );
};

export default SettingScreen;
