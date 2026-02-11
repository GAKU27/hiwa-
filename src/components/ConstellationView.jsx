/**
 * 灯輪（Hiwa）— Constellation（星座）ビュー
 *
 * 感情履歴を星座マップとしてCanvas 2Dで可視化。
 * X軸: 活力係数（左=静か、右=力強い）
 * Y軸: 深度係数（下=直截的、上=詩的）
 * 星の色: セッション時に選んだ色
 * 星のサイズ: 会話の長さに比例
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getConstellationData, getHistory, clearHistory } from '../lib/emotionHistory';
import { MODES, WEATHERS } from '../lib/emotionEngine';

const ConstellationView = ({ onBack }) => {
    const canvasRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);
    const [history, setHistory] = useState([]);
    const starsRef = useRef([]);

    // 履歴データを読み込み
    useEffect(() => {
        setHistory(getHistory());
    }, []);

    const constellationData = useMemo(() => getConstellationData(), [history]);

    // マッピング定数
    const PADDING = 60;
    const AXIS_LABEL_OFFSET = 30;

    // Canvas描画
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();

        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;
        const plotW = w - PADDING * 2;
        const plotH = h - PADDING * 2;

        // 背景
        ctx.fillStyle = 'rgba(8, 8, 12, 1)';
        ctx.fillRect(0, 0, w, h);

        // グリッド
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 10; i++) {
            const gx = PADDING + (plotW / 10) * i;
            const gy = PADDING + (plotH / 10) * i;
            ctx.beginPath();
            ctx.moveTo(gx, PADDING);
            ctx.lineTo(gx, PADDING + plotH);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(PADDING, gy);
            ctx.lineTo(PADDING + plotW, gy);
            ctx.stroke();
        }

        // 軸ラベル
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '10px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← 静か', PADDING + plotW * 0.15, PADDING + plotH + AXIS_LABEL_OFFSET);
        ctx.fillText('活力', PADDING + plotW * 0.5, PADDING + plotH + AXIS_LABEL_OFFSET);
        ctx.fillText('力強い →', PADDING + plotW * 0.85, PADDING + plotH + AXIS_LABEL_OFFSET);

        ctx.save();
        ctx.translate(PADDING - AXIS_LABEL_OFFSET, PADDING + plotH * 0.5);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('深度 (詩的 ↑ / 直截的 ↓)', 0, 0);
        ctx.restore();

        // 星座データがなければメッセージ
        if (constellationData.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '14px "Noto Sans JP", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('まだ星はありません', w / 2, h / 2 - 10);
            ctx.font = '11px "Noto Sans JP", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillText('対話を重ねると、ここに感情の星座が浮かびます', w / 2, h / 2 + 15);
            return;
        }

        // 星座線（時系列で隣接する星を接続）
        if (constellationData.length > 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let i = 0; i < constellationData.length; i++) {
                const star = constellationData[i];
                const sx = PADDING + star.x * plotW;
                const sy = PADDING + (1 - star.y) * plotH; // Y反転（上が高深度）
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
        }

        // 星を描画
        const starPositions = [];
        constellationData.forEach((star, i) => {
            const sx = PADDING + star.x * plotW;
            const sy = PADDING + (1 - star.y) * plotH;

            const r = parseInt(star.color.slice(1, 3), 16);
            const g = parseInt(star.color.slice(3, 5), 16);
            const b = parseInt(star.color.slice(5, 7), 16);

            // グロー
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, star.size * 4);
            gradient.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
            gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.08)`);
            gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, star.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // コア
            ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
            ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
            ctx.shadowBlur = star.size * 2;
            ctx.beginPath();
            ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            starPositions.push({ sx, sy, size: star.size, entry: star.entry });
        });

        starsRef.current = starPositions;
    }, [constellationData]);

    // ホバーでツールチップ
    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let found = null;
        for (const star of starsRef.current) {
            const dist = Math.sqrt((mx - star.sx) ** 2 + (my - star.sy) ** 2);
            if (dist < star.size + 10) {
                found = star;
                break;
            }
        }

        if (found) {
            setTooltip({
                x: e.clientX,
                y: e.clientY,
                entry: found.entry,
            });
        } else {
            setTooltip(null);
        }
    }, []);

    const handleClear = useCallback(() => {
        if (window.confirm('感情の履歴をすべて消去しますか？')) {
            clearHistory();
            setHistory([]);
        }
    }, []);

    const modeInfo = (modeId) => MODES[modeId] || MODES.TOMOSHIBI;
    const weatherInfo = (weatherId) => WEATHERS.find(w => w.id === weatherId) || WEATHERS[0];

    return (
        <div className="min-h-screen bg-[#08080c] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    <span className="text-xs tracking-wider">戻る</span>
                </button>

                <div className="flex items-center gap-4">
                    <span className="text-xs text-white/60 tracking-wider">
                        ✦ 星座 — Constellation
                    </span>
                    {history.length > 0 && (
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-1 text-white/50 hover:text-red-400/80 transition-colors cursor-pointer text-[10px]"
                        >
                            <Trash2 size={10} />
                            クリア
                        </button>
                    )}
                </div>
            </header>

            {/* Canvas area */}
            <div className="flex-1 relative p-4">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                    className="w-full h-full cursor-crosshair"
                    style={{ minHeight: '400px' }}
                />

                {/* 星の数 */}
                <div className="absolute bottom-6 right-6">
                    <span className="text-[10px] text-white/40 font-mono">
                        {history.length} stars
                    </span>
                </div>

                {/* Tooltip */}
                {tooltip && (
                    <div
                        className="fixed z-50 pointer-events-none animate-fade-in"
                        style={{
                            left: tooltip.x + 12,
                            top: tooltip.y - 8,
                        }}
                    >
                        <div className="bg-[#12121a]/95 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm max-w-xs">
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        backgroundColor: tooltip.entry.colorHex,
                                        boxShadow: `0 0 6px ${tooltip.entry.colorHex}80`,
                                    }}
                                />
                                <span className="text-xs text-white/85">
                                    {modeInfo(tooltip.entry.modeId).icon} {modeInfo(tooltip.entry.modeId).label}
                                </span>
                                <span className="text-[10px] text-white/50">
                                    {weatherInfo(tooltip.entry.weatherId).icon}
                                </span>
                            </div>

                            {tooltip.entry.firstMessage && (
                                <p className="text-xs text-white/70 mb-1 truncate">
                                    「{tooltip.entry.firstMessage.slice(0, 30)}{tooltip.entry.firstMessage.length > 30 ? '…' : ''}」
                                </p>
                            )}
                            {tooltip.entry.aiFirstResponse && (
                                <p className="text-[11px] text-white/55 italic truncate">
                                    → {tooltip.entry.aiFirstResponse.slice(0, 30)}{tooltip.entry.aiFirstResponse.length > 30 ? '…' : ''}
                                </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-[9px] text-white/45 font-mono">
                                <span>S:{tooltip.entry.silenceCoeff}</span>
                                <span>V:{tooltip.entry.vitalityCoeff}</span>
                                <span>D:{tooltip.entry.depthCoeff}</span>
                                <span>{tooltip.entry.messageCount} msgs</span>
                            </div>

                            <div className="text-[9px] text-white/40 mt-1">
                                {new Date(tooltip.entry.timestamp).toLocaleString('ja-JP', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConstellationView;
