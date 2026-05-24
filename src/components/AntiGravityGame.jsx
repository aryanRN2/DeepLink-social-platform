"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Coins, Volume2, VolumeX, Sparkles 
} from 'lucide-react';

export default function AntiGravityGame({ onClose }) {
  const [coins, setCoins] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const iframeRef = useRef(null);

  // Sync up coins from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCoins = localStorage.getItem('deeplink_climber_coins');
        if (savedCoins) {
          const v = parseInt(savedCoins, 10) || 0;
          setCoins(v);
        }
      } catch (e) {
        console.error("Error reading coins from localstorage:", e);
      }
    }

    const coinsInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const savedCoins = localStorage.getItem('deeplink_climber_coins');
        if (savedCoins) {
          const v = parseInt(savedCoins, 10) || 0;
          setCoins(v);
        }
      }
    }, 1000);

    return () => clearInterval(coinsInterval);
  }, []);

  // Sync volume state to iframe when the page is loaded
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'mute', muted: nextMuted }, '*');
    }
  };

  // Keyboard Event Forwarding to iframe for 100% reliable focus-free controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent browser spacebar/arrows scrolling only when game is open
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ 
          type: 'keydown', 
          key: e.key, 
          code: e.code 
        }, '*');
      }
    };
    
    const handleKeyUp = (e) => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ 
          type: 'keyup', 
          key: e.key, 
          code: e.code 
        }, '*');
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    
    // Automatically focus the iframe on load to enhance user controls immediately
    setTimeout(() => {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.focus();
      }
    }, 500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 font-sans select-none animate-fade-in text-slate-800">
      <div className="w-full max-w-5xl h-[88vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 flex flex-col relative">
        
        {/* Header toolbar */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl text-indigo-600 animate-bounce">🌀</span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">Gravity Flipper</h2>
              <p className="text-3xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> Quantum Grid Platformer
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Lobby Coin balance indicator */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100/60 px-3 py-1.5 rounded-xl">
              <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="font-extrabold text-xs text-amber-700">{coins}</span>
            </div>

            {/* Muted toggle */}
            <button 
              onClick={toggleMute}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 transition-all cursor-pointer"
              title={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Exit Close button */}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 active:scale-95 transition-all cursor-pointer"
              title="Close game"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Game Iframe viewport */}
        <div className="flex-1 relative bg-slate-950 flex flex-col overflow-hidden">
          <iframe 
            ref={iframeRef}
            src="/anti-gravity/index.html" 
            className="w-full h-full border-none" 
            title="Gravity Flipper Quantum Platformer"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
