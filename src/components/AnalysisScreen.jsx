
import React, { useState, useEffect, useRef } from 'react';
import { findClosestEmotionKeywords } from '../lib/colorLogic';

const AnalysisScreen = ({ selectedColor, onReset }) => {
    const [inputText, setInputText] = useState('');
    const [similarity, setSimilarity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modelLoading, setModelLoading] = useState(true);
    const [progress, setProgress] = useState(0); // Model download progress
    const [rainMode, setRainMode] = useState(false);
    const [worker, setWorker] = useState(null);
    const [closestAnchor, setClosestAnchor] = useState(null);

    const workerRef = useRef(null);

    // Initialize Worker and Anchor
    useEffect(() => {
        if (!selectedColor) return;

        // 1. Find anchor
        const anchor = findClosestEmotionKeywords(selectedColor.r, selectedColor.g, selectedColor.b);
        setClosestAnchor(anchor);

        // 2. Init Worker
        workerRef.current = new Worker(new URL('../workers/ai.worker.final.js', import.meta.url), {
            type: 'module'
        });

        workerRef.current.onmessage = (event) => {
            const { status, data, result } = event.data;

            if (status === 'progress') {
                // data.status can be 'initiate', 'download', 'progress', 'done'
                if (data.status === 'progress') {
                    setProgress(data.progress);
                }
            } else if (status === 'ready') {
                setModelLoading(false);
            } else if (status === 'complete') {
                setSimilarity(result);
                setLoading(false);
            } else if (status === 'error') {
                console.error("AI Worker Error:", data);
                setLoading(false);
                setModelLoading(false);
            }
        };

        workerRef.current.postMessage({ type: 'init' });
        setWorker(workerRef.current);

        return () => {
            workerRef.current.terminate();
        };
    }, [selectedColor]);

    const handleAnalyze = () => {
        if (!worker || !inputText.trim() || !closestAnchor) return;

        setLoading(true);
        // Send to worker
        worker.postMessage({
            type: 'analyze',
            payload: {
                text1: closestAnchor.keywords, // Color emotion keywords
                text2: inputText // User's trouble
            }
        });
    };

    // Get display similarity with Rain Mode bias
    const getDisplaySimilarity = () => {
        if (similarity === null) return 0;
        let score = similarity;
        if (rainMode) score += 0.05; // Rain mode bias
        return Math.min(Math.round(score * 100), 100);
    };

    const score = getDisplaySimilarity();

    // Dynamic message based on score
    const getMessage = (s) => {
        if (s >= 85) return "ふたつの色は、深く共鳴しています。あなたの心は今、この色そのものです。";
        if (s >= 60) return "少しずつ、色が重なり始めています。その感情を、大切にしてください。";
        return "色はまだ、少し遠くにあるようです。でも、それでいいのです。";
    };

    // Background style based on selected color (dimmed)
    const bgStyle = {
        background: `linear-gradient(135deg, 
      rgba(${selectedColor.r},${selectedColor.g},${selectedColor.b}, 0.1) 0%, 
      rgba(0,0,0,0.95) 100%)`
    };

    return (
        <div className="w-full h-screen flex flex-col items-center justify-center text-white relative overflow-hidden transition-colors duration-1000" style={bgStyle}>

            {/* Rain Effect Layer (Mock) */}
            {rainMode && (
                <div className="absolute inset-0 pointer-events-none bg-rain opacity-30 z-0"></div>
            )}

            {/* Header / Reset */}
            <div className="absolute top-8 left-8 z-20">
                <button onClick={onReset} className="text-sm opacity-60 hover:opacity-100 transition-opacity flex items-center gap-2">
                    ← 別の日、別の色
                </button>
            </div>

            {/* Rain Mode Toggle */}
            <div className="absolute top-8 right-8 z-20 flex items-center gap-2">
                <span className="text-xs opacity-50">Rain Mode</span>
                <button
                    onClick={() => setRainMode(!rainMode)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${rainMode ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                    <div className={`absolute w-3 h-3 bg-white rounded-full top-1 transition-transform ${rainMode ? 'left-6' : 'left-1'}`} />
                </button>
            </div>

            {/* Main Content */}
            <div className="max-w-md w-full px-6 z-10 flex flex-col gap-6">

                {/* Color Info */}
                <div className="text-center mb-4">
                    <div
                        className="w-16 h-16 rounded-full mx-auto mb-4 shadow-lg transition-transform duration-1000"
                        style={{
                            backgroundColor: `rgb(${selectedColor.r},${selectedColor.g},${selectedColor.b})`,
                            boxShadow: `0 0 30px rgba(${selectedColor.r},${selectedColor.g},${selectedColor.b}, 0.4)`
                        }}
                    />
                    <h2 className="text-xl font-light tracking-widest">{closestAnchor?.label}</h2>
                    <p className="text-xs opacity-50 mt-1">{closestAnchor?.keywords}</p>
                </div>

                {/* Loading State for Model */}
                {modelLoading && (
                    <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-800 text-center animate-pulse">
                        <p className="text-sm text-cyan-400 mb-2">AIモデルを準備中... (初回のみダウンロード)</p>
                        <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs opacity-50 mt-2">{progress.toFixed(0)}%</p>
                    </div>
                )}

                {/* Input Area */}
                {!modelLoading && !similarity && (
                    <div className="flex flex-col gap-4 animate-fade-in">
                        <label className="text-sm opacity-70 text-center">今、心にあるものをそのまま書いてみてください</label>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none h-32"
                            placeholder="..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !inputText}
                            className="bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white py-3 rounded-full transition-all tracking-widest border border-white/5"
                        >
                            {loading ? "共鳴中..." : "分析する"}
                        </button>
                    </div>
                )}

                {/* Result Area */}
                {similarity !== null && (
                    <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center animate-slide-up backdrop-blur-sm">
                        <p className="text-xs opacity-50 tracking-widest mb-2">SYNC RATE</p>
                        <div className="text-5xl font-thin mb-6 flex items-baseline justify-center gap-1">
                            <span className="transition-all duration-1000 ease-out">
                                {score}
                            </span>
                            <span className="text-lg opacity-50">%</span>
                        </div>
                        <p className="text-sm leading-relaxed opacity-90 mb-6 font-light">
                            {getMessage(score)}
                        </p>
                        <button
                            onClick={() => { setSimilarity(null); setInputText(''); }}
                            className="text-xs border-b border-transparent hover:border-white/50 opacity-50 hover:opacity-100 transition-all pb-0.5"
                        >
                            言葉を変える
                        </button>
                    </div>
                )}

            </div>

            <style jsx>{`
        .bg-rain {
          background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E");
          animation: rain 2s linear infinite;
        }
        @keyframes rain {
          from { background-position: 0 0; }
          to { background-position: 0 20px; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
        </div>
    );
};

export default AnalysisScreen;
