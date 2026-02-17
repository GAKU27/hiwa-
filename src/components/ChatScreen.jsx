/**
 * 灯輪（Hiwa）— チャット画面
 *
 * v12.1統合:
 * - 響（HIBIKI）6段階のヘッダー表示
 * - リサージュカーブ（SVG共鳴波形）
 * - Material Dust（光の粒）
 * - テキスト視認性の全面改善
 * - パーティクル演出 + 環境音 + 感情履歴保存
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { computeEmotionVector, buildSystemPrompt, MODES } from '../lib/emotionEngine';
import { generateResponse, isApiAvailable } from '../lib/geminiClient';
import { startAmbient, stopAmbient, playSendChime, playResponseBell, toggleMute, getMuteState, destroyAudio } from '../lib/ambientAudio';
import { saveSession } from '../lib/emotionHistory';
import ParticleCanvas from './ParticleCanvas';

const ChatScreen = ({ settings, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [displayedResponse, setDisplayedResponse] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [isMuted, setIsMuted] = useState(getMuteState());
    const [sessionSaved, setSessionSaved] = useState(false);
    const [waveformTime, setWaveformTime] = useState(0);
    // 動的背景色（AIのサイレント解析から受け取る）
    const [ambientColor, setAmbientColor] = useState(settings.color);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimerRef = useRef(null);
    const burstRef = useRef(0);

    const apiAvailable = useMemo(() => isApiAvailable(), []);

    // 感情ベクトルを計算
    const emotionVector = useMemo(
        () => computeEmotionVector(settings.mode, settings.color, settings.weather),
        [settings.mode, settings.color, settings.weather]
    );

    // システムプロンプトを構築
    const systemPrompt = useMemo(
        () => buildSystemPrompt(emotionVector),
        [emotionVector]
    );

    const currentMode = MODES[settings.mode];
    const hibiki = emotionVector.hibiki;

    // モード別ウェルカムメッセージ
    const welcomeMessages = useMemo(() => {
        switch (settings.mode) {
            case 'RAIMEI': return { main: '言葉にしろ。', sub: '何でもいい。ここにいる。' };
            case 'TENBIN': return { main: '……観測を開始します。', sub: '心にあることを、入力してください。' };
            default: return { main: '何も急がなくていい。', sub: '心にあることを、そのまま書いてみてください。' };
        }
    }, [settings.mode]);

    // モード別の入力プレースホルダー
    const placeholderText = useMemo(() => {
        switch (settings.mode) {
            case 'RAIMEI': return '吐き出せ';
            case 'TENBIN': return '入力してください';
            default: return 'ここに、心にあることを…';
        }
    }, [settings.mode]);

    // 背景グラデーション（ambientColor + モードカラーでじわ〜っと変化）
    const bgStyle = useMemo(() => {
        const hex = ambientColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        // モードカラーをRGBに
        const mc = currentMode.color;
        const mr = parseInt(mc.slice(1, 3), 16);
        const mg = parseInt(mc.slice(3, 5), 16);
        const mb = parseInt(mc.slice(5, 7), 16);
        return {
            background: `
        radial-gradient(ellipse at 30% 20%, rgba(${r},${g},${b},0.10) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(${r},${g},${b},0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 0%, rgba(${mr},${mg},${mb},0.04) 0%, transparent 40%),
        linear-gradient(180deg, rgba(8,8,12,1) 0%, rgba(12,12,18,1) 100%)
      `,
            transition: 'background 3s ease',
        };
    }, [ambientColor, currentMode.color]);

    // ── リサージュカーブ ──
    useEffect(() => {
        const timer = setInterval(() => {
            setWaveformTime(t => t + 1);
        }, 50);
        return () => clearInterval(timer);
    }, []);

    const lissajousPath = useMemo(() => {
        const points = 180;
        const size = 800;
        const center = size / 2;
        const amplitude = 200 + emotionVector.vitalityCoeff * 150;
        // 3軸で波形パラメータを制御
        const a = 2 + Math.round(emotionVector.vitalityCoeff * 3);
        const b = 3 + Math.round(emotionVector.depthCoeff * 2);
        let path = '';

        for (let i = 0; i <= points; i++) {
            const t = (i / points) * Math.PI * 2;
            const x = center + amplitude * Math.sin(a * t + waveformTime * 0.012);
            const y = center + amplitude * Math.sin(b * t + waveformTime * 0.008);
            path += (i === 0 ? 'M' : 'L') + `${x},${y}`;
        }
        return path;
    }, [waveformTime, emotionVector.vitalityCoeff, emotionVector.depthCoeff]);

    // ── 音響システム ──
    useEffect(() => {
        startAmbient(settings.weather);
        return () => {
            destroyAudio();
        };
    }, [settings.weather]);

    // ── 感情履歴の保存（画面離脱時） ──
    const handleBack = useCallback(() => {
        if (messages.length > 0 && !sessionSaved) {
            saveSession({ emotionVector, messages });
            setSessionSaved(true);
        }
        stopAmbient();
        onBack();
    }, [messages, emotionVector, sessionSaved, onBack]);

    // スクロール
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, displayedResponse, scrollToBottom]);

    // タイプライターエフェクト
    const typewriterEffect = useCallback((text) => {
        return new Promise((resolve) => {
            let currentIndex = 0;
            setIsTyping(true);
            setDisplayedResponse('');

            const type = () => {
                if (currentIndex < text.length) {
                    setDisplayedResponse(text.substring(0, currentIndex + 1));
                    currentIndex++;
                    const char = text[currentIndex - 1];
                    const delay = (char === '。' || char === '、' || char === '…') ? 180 : 60 + Math.random() * 40;
                    typingTimerRef.current = setTimeout(type, delay);
                } else {
                    setIsTyping(false);
                    resolve(text);
                }
            };

            type();
        });
    }, []);

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    // メッセージ送信
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || isLoading || isTyping) return;

        setShowWelcome(false);
        setInputText('');

        playSendChime(currentMode.color);
        burstRef.current = 12;

        const userMsg = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);

        setIsLoading(true);

        try {
            const response = await generateResponse(systemPrompt, text, settings.mode, messages);
            setIsLoading(false);
            const aiMsgId = Date.now() + 1;

            // サイレント解析の色で背景をじわ〜っと変化
            if (response.colorHex) {
                setAmbientColor(response.colorHex);
            }

            await typewriterEffect(response.text);
            playResponseBell();
            const aiMsg = { id: aiMsgId, role: 'ai', content: response.text };
            setMessages(prev => [...prev, aiMsg]);
            setDisplayedResponse('');
        } catch (error) {
            console.error('Error:', error);
            setIsLoading(false);
            const errorMsg = { id: Date.now() + 1, role: 'ai', content: '……。' };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    // Enterキーで送信
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ミュートトグル
    const handleToggleMute = useCallback(() => {
        const newState = toggleMute();
        setIsMuted(newState);
    }, []);



    // Material Dust用のランダム値
    const dustParticles = useMemo(() => {
        const count = hibiki.stage.dustCount || 5;
        return [...Array(count)].map((_, i) => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            delay: `${Math.random() * -20}s`,
            duration: `${15 + Math.random() * 20}s`,
            dx: `${(Math.random() - 0.5) * 80}px`,
            dy: `${(Math.random() - 0.5) * 80}px`,
        }));
    }, [hibiki.stage.dustCount]);

    return (
        <div className="min-h-screen flex flex-col relative" style={bgStyle}>
            {/* パーティクル背景 */}
            <ParticleCanvas
                colorHex={settings.color}
                weatherId={settings.weather}
                silenceCoeff={emotionVector.silenceCoeff}
                onBurst={burstRef}
            />

            {/* リサージュカーブ SVG 背景 */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[1]">
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 800 800"
                    className="absolute opacity-15 animate-lissajous"
                    style={{ filter: `drop-shadow(0 0 20px ${settings.color})` }}
                >
                    <path
                        d={lissajousPath}
                        fill="none"
                        stroke={settings.color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <path
                        d={lissajousPath}
                        fill="none"
                        stroke={settings.color}
                        strokeWidth="0.5"
                        strokeLinecap="round"
                        opacity="0.3"
                        style={{ transform: 'translate(10px, 10px)' }}
                    />
                </svg>
            </div>

            {/* Material Dust */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2]">
                {dustParticles.map((dust, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/30 rounded-full animate-material-dust"
                        style={{
                            left: dust.left,
                            top: dust.top,
                            animationDelay: dust.delay,
                            '--dust-duration': dust.duration,
                            '--dust-dx': dust.dx,
                            '--dust-dy': dust.dy,
                            boxShadow: `0 0 6px ${hibiki.stage.color}66`,
                        }}
                    />
                ))}
            </div>

            {/* Header — モードカラーでアクセント */}
            <header
                className="flex items-center justify-between px-6 py-4 relative z-10"
                style={{ borderBottom: `1px solid ${currentMode.color}18` }}
            >
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-white/55 hover:text-white/90 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    <span className="text-xs tracking-wider">設定に戻る</span>
                </button>

                <div className="flex items-center gap-3">
                    {/* ミュートボタン */}
                    <button
                        onClick={handleToggleMute}
                        className="text-white/45 hover:text-white/80 transition-colors cursor-pointer p-1"
                        title={isMuted ? '音をオンにする' : '音を消す'}
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>

                    {/* HIBIKI段階表示 */}
                    <div className="flex items-center gap-2 animate-hibiki-reveal">
                        <div
                            className="w-2 h-2 rounded-full animate-pulse-glow"
                            style={{ backgroundColor: hibiki.stage.color, color: hibiki.stage.color }}
                        />
                        <span
                            className="text-[10px] font-bold tracking-[0.2em] uppercase"
                            style={{ color: hibiki.stage.color }}
                        >
                            {hibiki.stage.en}
                        </span>
                    </div>

                    <div className="w-px h-4" style={{ backgroundColor: `${currentMode.color}20` }} />

                    <div
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: currentMode.color,
                            boxShadow: `0 0 8px ${currentMode.color}60`,
                        }}
                    />
                    <span
                        className="text-xs tracking-wider"
                        style={{ color: `${currentMode.color}bb` }}
                    >
                        {currentMode.icon} {currentMode.label}
                    </span>
                    {!apiAvailable && (
                        <span className="text-[10px] text-amber-400/70 flex items-center gap-1">
                            <Sparkles size={10} /> mock
                        </span>
                    )}
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
                <div className="max-w-xl mx-auto space-y-6">
                    {/* Welcome Message — モード別 */}
                    {showWelcome && messages.length === 0 && (
                        <div className="text-center py-24 animate-fade-in">
                            <div
                                className="w-16 h-16 rounded-full mx-auto mb-8 animate-breathing"
                                style={{
                                    backgroundColor: `${currentMode.color}22`,
                                    boxShadow: `0 0 50px ${currentMode.color}18`,
                                }}
                            />
                            <p
                                className="text-sm font-light tracking-wider"
                                style={{ color: `${currentMode.color}cc` }}
                            >
                                {welcomeMessages.main}
                            </p>
                            <p className="text-white/45 text-xs mt-3 font-light tracking-wider">
                                {welcomeMessages.sub}
                            </p>
                            {/* HIBIKI状態 */}
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: hibiki.stage.color }}
                                />
                                <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: hibiki.stage.color }}>
                                    {hibiki.stage.en} — {hibiki.stage.desc}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Message List */}
                    {messages.map((msg, index) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-msg-appear`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {msg.role === 'user' ? (
                                <div
                                    className="max-w-[80%] px-5 py-3 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed"
                                    style={{
                                        backgroundColor: `${currentMode.color}0a`,
                                        border: `1px solid ${currentMode.color}15`,
                                    }}
                                >
                                    {msg.content}
                                </div>
                            ) : (
                                <div
                                    className="max-w-[80%] flex items-start gap-3 pl-3 border-l-2 animate-ai-glow"
                                    style={{
                                        borderColor: `${currentMode.color}60`,
                                        '--glow-color': currentMode.color,
                                    }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                        style={{
                                            backgroundColor: currentMode.color,
                                            boxShadow: `0 0 8px ${currentMode.color}80`,
                                        }}
                                    />
                                    <p className="text-white/95 text-base md:text-lg font-light leading-relaxed tracking-wide">
                                        {msg.content}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && !isTyping && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-2 h-2 rounded-full animate-breathing"
                                    style={{
                                        backgroundColor: currentMode.color,
                                        boxShadow: `0 0 6px ${currentMode.color}80`,
                                    }}
                                />
                                <div className="flex gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full animate-bounce-dot" style={{ animationDelay: '0ms', backgroundColor: `${currentMode.color}80` }} />
                                    <span className="w-1.5 h-1.5 rounded-full animate-bounce-dot" style={{ animationDelay: '150ms', backgroundColor: `${currentMode.color}80` }} />
                                    <span className="w-1.5 h-1.5 rounded-full animate-bounce-dot" style={{ animationDelay: '300ms', backgroundColor: `${currentMode.color}80` }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Typewriter Display */}
                    {isTyping && displayedResponse && (
                        <div className="flex justify-start animate-fade-in">
                            <div
                                className="max-w-[80%] flex items-start gap-3 pl-3 border-l-2"
                                style={{
                                    borderColor: `${currentMode.color}60`,
                                }}
                            >
                                <div
                                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0 animate-breathing"
                                    style={{
                                        backgroundColor: currentMode.color,
                                        boxShadow: `0 0 8px ${currentMode.color}80`,
                                    }}
                                />
                                <p className="text-white/95 text-base md:text-lg font-light leading-relaxed tracking-wide">
                                    {displayedResponse}
                                    <span
                                        className="inline-block w-0.5 h-5 ml-0.5 animate-blink align-middle"
                                        style={{ backgroundColor: `${currentMode.color}cc` }}
                                    />
                                </p>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area — モードカラーアクセント */}
            <div
                className="px-6 py-4 relative z-10"
                style={{ borderTop: `1px solid ${currentMode.color}12` }}
            >
                <div className="max-w-xl mx-auto flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholderText}
                            rows={1}
                            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none transition-all resize-none leading-relaxed"
                            style={{
                                minHeight: '44px',
                                maxHeight: '120px',
                                backgroundColor: `${currentMode.color}08`,
                                border: `1px solid ${currentMode.color}15`,
                                boxShadow: inputText ? `0 0 15px ${currentMode.color}10` : 'none',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = `${currentMode.color}35`;
                                e.target.style.boxShadow = `0 0 20px ${currentMode.color}15`;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = `${currentMode.color}15`;
                                e.target.style.boxShadow = 'none';
                            }}
                            disabled={isLoading || isTyping}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading || isTyping}
                        className="flex-shrink-0 p-3 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                        style={{
                            backgroundColor: `${currentMode.color}12`,
                            border: `1px solid ${currentMode.color}20`,
                        }}
                        onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                                e.currentTarget.style.backgroundColor = `${currentMode.color}25`;
                                e.currentTarget.style.boxShadow = `0 0 15px ${currentMode.color}20`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = `${currentMode.color}12`;
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? (
                            <Loader2 size={18} style={{ color: `${currentMode.color}cc` }} className="animate-spin" />
                        ) : (
                            <Send size={18} style={{ color: `${currentMode.color}cc` }} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatScreen;
