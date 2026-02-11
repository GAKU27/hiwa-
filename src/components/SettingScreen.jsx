import React, { useState, useMemo } from 'react';
import { MODES, WEATHERS } from '../lib/emotionEngine';
import { isApiAvailable } from '../lib/geminiClient';
import { getHistory } from '../lib/emotionHistory';
import { Sparkles, ChevronRight, Palette, Star } from 'lucide-react';

const SettingScreen = ({ onStart, onConstellation }) => {
    const [selectedMode, setSelectedMode] = useState('TOMOSHIBI');
    const [selectedColor, setSelectedColor] = useState('#4a5568');
    const [selectedWeather, setSelectedWeather] = useState('cloudy');
    const [isTransitioning, setIsTransitioning] = useState(false);

    const apiAvailable = useMemo(() => isApiAvailable(), []);

    const handleStart = () => {
        onStart({
            mode: selectedMode,
            color: selectedColor,
            weather: selectedWeather,
        });
    };

    // 選択した色でじんわりとしたグラデーション
    const bgStyle = useMemo(() => {
        const hex = selectedColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return {
            background: `radial-gradient(ellipse at 50% 80%, rgba(${r},${g},${b},0.15) 0%, rgba(10,10,15,1) 70%)`,
            transition: 'background 1.5s ease',
        };
    }, [selectedColor]);

    const currentMode = MODES[selectedMode];

    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-center px-6 py-12 transition-opacity duration-700 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
            style={bgStyle}
        >
            {/* Header */}
            <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.25em] text-white/90 mb-3">
                    灯輪
                </h1>
                <p className="text-xs md:text-sm text-white/55 tracking-widest font-light">
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
                <p className="text-xs text-white/60 tracking-widest mb-4 text-center uppercase">Mode — 意思</p>
                <div className="grid grid-cols-3 gap-3">
                    {Object.values(MODES).map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setSelectedMode(mode.id)}
                            className={`group relative p-4 rounded-2xl border transition-all duration-500 cursor-pointer ${selectedMode === mode.id
                                ? 'border-white/30 bg-white/[0.07] shadow-lg'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                                }`}
                        >
                            <div className="text-2xl mb-2">{mode.icon}</div>
                            <div className="text-sm font-light text-white/90 tracking-wider">{mode.label}</div>
                            <div className="text-[10px] text-white/55 mt-1">{mode.sub}</div>
                            {selectedMode === mode.id && (
                                <div
                                    className="absolute inset-0 rounded-2xl pointer-events-none"
                                    style={{
                                        boxShadow: `inset 0 0 30px rgba(${hexToRgb(mode.color)}, 0.1)`,
                                    }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-white/55 text-center mt-3 font-light">
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
                        <p className="text-white/55 text-[10px] mt-1">心に浮かぶ色を選んでください</p>
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
                        >
                            <div className="text-lg mb-1">{weather.icon}</div>
                            <div className="text-[10px] text-white/65">{weather.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Start Button */}
            <button
                onClick={handleStart}
                className="group flex items-center gap-3 px-8 py-4 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500 animate-fade-in-delay-4 cursor-pointer"
            >
                <span className="text-sm text-white/85 tracking-[0.15em] font-light group-hover:text-white transition-colors">
                    対話を始める
                </span>
                <ChevronRight size={16} className="text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 星座ビューへのリンク */}
            {onConstellation && (
                <button
                    onClick={onConstellation}
                    className="mt-6 flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors cursor-pointer animate-fade-in-delay-4"
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

// Helper
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
        : '100,100,100';
}

export default SettingScreen;
