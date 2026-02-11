/**
 * 灯輪（Hiwa）— パーティクルキャンバス
 *
 * Canvas 2D でチャット背景にパーティクル演出をレンダリング。
 * 天気・静寂係数・選択色に連動して挙動が変化する。
 */

import React, { useRef, useEffect, useCallback } from 'react';

// ============================
// パーティクルクラス
// ============================

class Particle {
    constructor(canvas, color, behavior) {
        this.canvas = canvas;
        this.behavior = behavior;
        this.reset(color, true);
    }

    reset(color, initial = false) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 色をRGBAに分解
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        this.r = r;
        this.g = g;
        this.b = b;

        switch (this.behavior) {
            case 'rise': // 晴れ: 上昇
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : h + 10;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(0.2 + Math.random() * 0.5);
                this.size = 1.5 + Math.random() * 2.5;
                this.alpha = 0.1 + Math.random() * 0.25;
                this.life = 1.0;
                this.decay = 0.001 + Math.random() * 0.002;
                break;

            case 'rain': // 雨: 落下する光の筋
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : -10;
                this.vx = -0.3;
                this.vy = 1.5 + Math.random() * 2.5;
                this.size = 0.8 + Math.random() * 0.8;
                this.length = 8 + Math.random() * 15; // 筋の長さ
                this.alpha = 0.05 + Math.random() * 0.15;
                this.life = 1.0;
                this.decay = 0;
                break;

            case 'snow': // 雪: ゆらゆら落下
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : -10;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = 0.15 + Math.random() * 0.35;
                this.size = 1 + Math.random() * 3;
                this.alpha = 0.08 + Math.random() * 0.15;
                this.wobble = Math.random() * Math.PI * 2; // 横揺れ位相
                this.wobbleSpeed = 0.01 + Math.random() * 0.02;
                this.wobbleAmp = 0.3 + Math.random() * 0.7;
                this.life = 1.0;
                this.decay = 0;
                break;

            case 'star': // 深夜: 点滅する光点
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.vx = 0;
                this.vy = 0;
                this.size = 0.5 + Math.random() * 2;
                this.alpha = 0;
                this.targetAlpha = 0.1 + Math.random() * 0.3;
                this.blinkPhase = Math.random() * Math.PI * 2;
                this.blinkSpeed = 0.005 + Math.random() * 0.015;
                this.life = 1.0;
                this.decay = 0;
                break;

            default: // 曇り: ゆっくり浮遊
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.size = 1.5 + Math.random() * 2;
                this.alpha = 0.06 + Math.random() * 0.12;
                this.life = 1.0;
                this.decay = 0.0005 + Math.random() * 0.001;
                break;
        }
    }

    update(speedMultiplier) {
        switch (this.behavior) {
            case 'rain':
                this.x += this.vx * speedMultiplier;
                this.y += this.vy * speedMultiplier;
                if (this.y > this.canvas.height + 20) {
                    this.life = 0;
                }
                break;

            case 'snow':
                this.wobble += this.wobbleSpeed;
                this.x += this.vx * speedMultiplier + Math.sin(this.wobble) * this.wobbleAmp;
                this.y += this.vy * speedMultiplier;
                if (this.y > this.canvas.height + 10) {
                    this.life = 0;
                }
                break;

            case 'star':
                this.blinkPhase += this.blinkSpeed;
                this.alpha = this.targetAlpha * (0.3 + 0.7 * Math.abs(Math.sin(this.blinkPhase)));
                break;

            case 'rise':
                this.x += this.vx * speedMultiplier;
                this.y += this.vy * speedMultiplier;
                this.life -= this.decay;
                if (this.y < -10) this.life = 0;
                break;

            default: // float
                this.x += this.vx * speedMultiplier;
                this.y += this.vy * speedMultiplier;
                this.life -= this.decay;

                // 画面端で折り返し
                if (this.x < 0) this.x = this.canvas.width;
                if (this.x > this.canvas.width) this.x = 0;
                if (this.y < 0) this.y = this.canvas.height;
                if (this.y > this.canvas.height) this.y = 0;
                break;
        }
    }

    draw(ctx) {
        const a = this.alpha * Math.min(this.life, 1);
        if (a <= 0.01) return;

        ctx.save();

        if (this.behavior === 'rain') {
            // 雨は線として描画
            ctx.strokeStyle = `rgba(${this.r},${this.g},${this.b},${a})`;
            ctx.lineWidth = this.size;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.vx * 3, this.y - this.length);
            ctx.stroke();
        } else {
            // その他は円 + グロー
            ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${a})`;
            ctx.shadowColor = `rgba(${this.r},${this.g},${this.b},${a * 0.6})`;
            ctx.shadowBlur = this.size * 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    get isDead() {
        return this.life <= 0;
    }
}

// ============================
// React コンポーネント
// ============================

const WEATHER_BEHAVIOR = {
    sunny: 'rise',
    cloudy: 'float',
    rainy: 'rain',
    snowy: 'snow',
    night: 'star',
};

const ParticleCanvas = ({ colorHex = '#4a5568', weatherId = 'cloudy', silenceCoeff = 0.3, onBurst }) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const rafRef = useRef(null);
    const burstCountRef = useRef(0);

    // パーティクル数を静寂係数で調整（静かなほど少ない）
    const maxParticles = Math.floor(30 + (1 - silenceCoeff) * 50); // 30〜80
    const speedMultiplier = 0.5 + (1 - silenceCoeff) * 0.5; // 0.5〜1.0

    const behavior = WEATHER_BEHAVIOR[weatherId] || 'float';

    const initParticles = useCallback((canvas) => {
        const particles = [];
        for (let i = 0; i < maxParticles; i++) {
            particles.push(new Particle(canvas, colorHex, behavior));
        }
        return particles;
    }, [maxParticles, colorHex, behavior]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width, height;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resize();
        window.addEventListener('resize', resize);

        particlesRef.current = initParticles(canvas);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const particles = particlesRef.current;

            // バーストキューがあれば追加
            while (burstCountRef.current > 0 && particles.length < maxParticles + 20) {
                const burstParticle = new Particle(canvas, colorHex, behavior);
                // バースト用: 中心から全方向に素早く拡散
                burstParticle.x = width / 2;
                burstParticle.y = height * 0.7;
                burstParticle.vx = (Math.random() - 0.5) * 3;
                burstParticle.vy = (Math.random() - 0.5) * 3;
                burstParticle.alpha = 0.3 + Math.random() * 0.3;
                burstParticle.decay = 0.008 + Math.random() * 0.005;
                burstParticle.size = 1 + Math.random() * 3;
                particles.push(burstParticle);
                burstCountRef.current--;
            }

            // 更新と描画
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update(speedMultiplier);
                p.draw(ctx);

                if (p.isDead) {
                    if (particles.length <= maxParticles) {
                        p.reset(colorHex);
                    } else {
                        particles.splice(i, 1);
                    }
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [colorHex, behavior, maxParticles, speedMultiplier, initParticles]);

    // バーストトリガー用のメソッドを公開
    useEffect(() => {
        if (onBurst) {
            // 親コンポーネントがburst関数を取得できるようにする
        }
    }, [onBurst]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
};

// バーストをトリガーするためのimperative handle
ParticleCanvas.triggerBurst = (ref, count = 15) => {
    if (ref?.current) {
        ref.current = count;
    }
};

export default ParticleCanvas;
export { Particle };
