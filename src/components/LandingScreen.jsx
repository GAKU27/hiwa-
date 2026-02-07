
import React, { useState, useEffect } from 'react';
import { COLOR_ANCHORS } from '../lib/colorLogic';

// Generate random positions and sizes for organic feel
const generateOrbs = (count) => {
    return Array.from({ length: count }, (_, i) => {
        // Pick a random anchor color for the orb
        const anchor = COLOR_ANCHORS[Math.floor(Math.random() * COLOR_ANCHORS.length)];
        return {
            id: i,
            r: anchor.r,
            g: anchor.g,
            b: anchor.b,
            size: Math.random() * 60 + 40, // 40-100px
            left: Math.random() * 80 + 10, // 10-90%
            top: Math.random() * 80 + 10,  // 10-90%
            duration: Math.random() * 10 + 10, // 10-20s float duration
            delay: Math.random() * 5,
        };
    });
};

const LandingScreen = ({ onColorSelect }) => {
    const [orbs, setOrbs] = useState([]);

    useEffect(() => {
        setOrbs(generateOrbs(15));
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center text-white">
            {/* Background ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black z-0 pointer-events-none" />

            {/* Title */}
            <div className="z-10 text-center pointer-events-none mb-12">
                <h1 className="text-4xl md:text-6xl font-thin tracking-[0.2em] mb-4 opacity-90">灯輪</h1>
                <p className="text-sm md:text-base font-light tracking-widest opacity-70">
                    心の色を、選んでください。
                </p>
            </div>

            {/* Floating Orbs */}
            <div className="absolute inset-0 z-0">
                {orbs.map((orb) => (
                    <div
                        key={orb.id}
                        className="absolute rounded-full mix-blend-screen cursor-pointer transition-transform hover:scale-110 active:scale-95 animate-float"
                        style={{
                            backgroundColor: `rgb(${orb.r}, ${orb.g}, ${orb.b})`,
                            width: orb.size,
                            height: orb.size,
                            left: `${orb.left}%`,
                            top: `${orb.top}%`,
                            boxShadow: `0 0 ${orb.size / 2}px ${orb.size / 4}px rgba(${orb.r}, ${orb.g}, ${orb.b}, 0.6)`,
                            animation: `float ${orb.duration}s infinite ease-in-out ${orb.delay}s`,
                        }}
                        onClick={() => onColorSelect({ r: orb.r, g: orb.g, b: orb.b })}
                    />
                ))}
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -50px); }
          66% { transform: translate(-20px, 20px); }
        }
        .animate-float {
          animation-name: float;
        }
      `}</style>
        </div>
    );
};

export default LandingScreen;
