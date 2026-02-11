/**
 * 灯輪（Hiwa）ベータ版 — メインアプリケーション
 *
 * 動的感情対話エンジン
 * 設定画面 → チャット画面 / 星座ビュー の一連のフローを制御
 * ダイブトランジション（v12.1準拠）
 */

import React, { useState, useCallback } from 'react';
import SettingScreen from './components/SettingScreen';
import ChatScreen from './components/ChatScreen';
import ConstellationView from './components/ConstellationView';

const App = () => {
    const [currentView, setCurrentView] = useState('setting'); // 'setting' | 'chat' | 'constellation'
    const [settings, setSettings] = useState(null);
    const [isDiving, setIsDiving] = useState(false);

    // ダイブトランジション付きの画面遷移
    const diveTransition = useCallback((targetView, newSettings = null) => {
        setIsDiving(true);
        setTimeout(() => {
            if (newSettings) setSettings(newSettings);
            setCurrentView(targetView);
            setIsDiving(false);
        }, 500);
    }, []);

    const handleStart = useCallback((settingsData) => {
        diveTransition('chat', settingsData);
    }, [diveTransition]);

    const handleBack = useCallback(() => {
        diveTransition('setting');
    }, [diveTransition]);

    const handleConstellation = useCallback(() => {
        diveTransition('constellation');
    }, [diveTransition]);

    return (
        <div className="min-h-screen bg-[#08080c]">
            {/* ダイブトランジション */}
            <div className={`fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center transition-all ${isDiving ? 'opacity-100' : 'opacity-0'}`}>
                <div
                    className={`bg-white rounded-full ${isDiving ? 'animate-dive-in' : ''}`}
                    style={{ width: '10px', height: '10px' }}
                />
            </div>

            {currentView === 'setting' && (
                <SettingScreen onStart={handleStart} onConstellation={handleConstellation} />
            )}
            {currentView === 'chat' && settings && (
                <ChatScreen settings={settings} onBack={handleBack} />
            )}
            {currentView === 'constellation' && (
                <ConstellationView onBack={handleBack} />
            )}
        </div>
    );
};

export default App;
