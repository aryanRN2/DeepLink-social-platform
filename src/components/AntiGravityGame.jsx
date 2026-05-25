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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-0 md:p-4 font-sans select-none animate-fade-in text-slate-850">
      <div className="w-full h-full md:max-w-5xl md:h-[88vh] bg-[#02000a] rounded-none md:rounded-3xl overflow-hidden shadow-2xl border-none md:border md:border-indigo-950/30 flex flex-col relative">
        
        {/* Sleek Dark Premium Header toolbar */}
        <div className="bg-[#060610] border-b border-indigo-950/40 px-3 py-1.5 md:px-6 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className="text-xl md:text-2xl text-indigo-500 animate-pulse">🌀</span>
            <div>
              <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight leading-tight">Gravity Flipper</h2>
              <p className="text-4xs md:text-3xs text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2 md:w-2.5 h-2 md:h-2.5 text-indigo-400" /> Quantum Grid Platformer
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Lobby Coin balance indicator */}
            <div className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/30 px-2.5 py-1 rounded-xl">
              <Coins className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span className="font-extrabold text-[10px] md:text-xs text-amber-500">{coins}</span>
            </div>

            {/* Muted toggle */}
            <button 
              onClick={toggleMute}
              className="p-1.5 md:p-2 rounded-xl bg-indigo-950/20 border border-indigo-900/30 hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-200 active:scale-95 transition-all cursor-pointer"
              title={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            </button>

            {/* Exit Close button */}
            <button 
              onClick={onClose}
              className="p-1.5 md:p-2 rounded-xl bg-rose-950/20 border border-rose-900/30 hover:bg-rose-900/40 text-rose-450 hover:text-rose-250 active:scale-95 transition-all cursor-pointer"
              title="Close game"
            >
              <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Absolute-positioned Game Iframe to prevent mobile layout scaling bugs */}
        <div className="flex-1 relative bg-[#02000a] overflow-hidden">
          <iframe 
            ref={iframeRef}
            src="/anti-gravity/index.html" 
            className="absolute inset-0 w-full h-full border-none" 
            title="Gravity Flipper Quantum Platformer"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
