"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, ShieldCheck, Eye, EyeOff, UserCheck, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import VehicleGame from './VehicleGame';

const DEEPLINK_MEMBERS = [
  { id: 'aryan', name: 'Aryan', avatar: '👾', status: 'Core Developer' },
  { id: 'nitin', name: 'Nitin', avatar: '⚡', status: 'Speedster' },
  { id: 'niraj', name: 'Niraj', avatar: '🔥', status: 'Firecracker' },
  { id: 'vivek', name: 'Vivek', avatar: '🎩', status: 'The Tactician' },
  { id: 'kartik', name: 'Kartik', avatar: '🦊', status: 'Shadow Hunter' },
  { id: 'anstik', name: 'Anstik', avatar: '👽', status: 'Void Walker' },
  { id: 'anshik', name: 'Anshik', avatar: '🚀', status: 'Rocket Engineer' },
  { id: 'ayush', name: 'Ayush', avatar: '👑', status: 'The Spark' },
  { id: 'himanshu', name: 'Himanshu HDR (Bhaiya)', avatar: '🌟', status: 'Cosmic Star' }
];

export default function JoinScreen({ onJoin }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('granted');
  const [activeStep, setActiveStep] = useState(1);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // Auto-trigger browser permission prompt if still default
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          setNotificationPermission(perm);
        });
      }
    }
  }, []);

  if (typeof window !== 'undefined' && 'Notification' in window && notificationPermission !== 'granted') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xl p-4 font-sans select-none animate-fade-in">
        <div className="glass-panel-glow max-w-md w-full p-6 sm:p-8 text-center rounded-3xl space-y-6 shadow-2xl border border-white/50 bg-white/95">
          <div className="relative inline-flex items-center justify-center h-20 w-20 rounded-full bg-indigo-50 border border-indigo-100 shadow-md">
            <span className="text-4xl animate-bounce">🔔</span>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-800">
              Notification Permissions Required
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              <strong>DeepLink</strong> connects you and your friends instantly. To make sure you never miss a new chat message or reply on your device, notification access is strictly required to enter.
            </p>
          </div>

          {notificationPermission === 'denied' ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 text-slate-700 text-xs text-left space-y-4">
              <div>
                <p className="font-extrabold text-amber-800 flex items-center gap-1.5 text-xs sm:text-sm">
                  ⚠️ Notifications are Blocked
                </p>
                <p className="leading-relaxed text-slate-600 mt-1">
                  You blocked notification permissions for this website. Modern browsers strictly block us from requesting it again automatically. You must allow it manually to enter.
                </p>
              </div>

              {/* 📱 Mobile Android Chrome Tutorial Slider */}
              <div className="bg-white border border-slate-150 p-4 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-3xs flex items-center gap-1">
                    📱 Android Chrome Guide
                  </span>
                  <span className="text-indigo-650 font-extrabold text-3xs text-indigo-600">
                    Step {activeStep} of 4
                  </span>
                </div>

                {/* Step Image Box */}
                <div className="relative w-full aspect-[4/3] max-h-56 bg-slate-950/5 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                  <img 
                    src={`/tutorial/${activeStep}.png`} 
                    alt={`Android Chrome guide Step ${activeStep}`} 
                    className="w-full h-full object-contain max-h-full transition-all duration-300 select-none"
                  />
                </div>

                {/* Step Instructions Text */}
                <div className="space-y-1 py-1">
                  <p className="font-extrabold text-slate-800 text-xs">
                    {activeStep === 1 && "1. Tap the Settings / Lock Icon"}
                    {activeStep === 2 && "2. Click Permissions / Site Settings"}
                    {activeStep === 3 && "3. Tap Notifications Section"}
                    {activeStep === 4 && "4. Switch Permission to Allow"}
                  </p>
                  <p className="text-slate-500 text-3xs leading-relaxed font-semibold">
                    {activeStep === 1 && "Look at your mobile browser's URL address bar. Tap the settings lock controller button immediately to the left of the URL text."}
                    {activeStep === 2 && "In the popup overlay card, tap on the 'Permissions' option or open your browser's 'Site Settings' panel."}
                    {activeStep === 3 && "Locate the 'Notifications' or 'Permissions' row inside the browser's settings page."}
                    {activeStep === 4 && "Toggle the switch or tap to set the Notifications permission state from 'Blocked' to 'Allow'. Then click the Check Status button below!"}
                  </p>
                </div>

                {/* Slider Navigation Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={activeStep === 1}
                    onClick={() => setActiveStep(prev => prev - 1)}
                    className="py-1 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-3xs font-extrabold transition-all cursor-pointer"
                  >
                    &larr; Prev
                  </button>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((stepNum) => (
                      <button
                        key={stepNum}
                        type="button"
                        onClick={() => setActiveStep(stepNum)}
                        className={`h-2 w-2 rounded-full transition-all cursor-pointer ${activeStep === stepNum ? 'bg-indigo-600 w-3.5' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={activeStep === 4}
                    onClick={() => setActiveStep(prev => prev + 1)}
                    className="py-1 px-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-650 hover:bg-indigo-100 disabled:opacity-40 disabled:hover:bg-indigo-50 text-3xs font-extrabold transition-all cursor-pointer"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    Notification.requestPermission().then(perm => {
                      setNotificationPermission(perm);
                    });
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-all cursor-pointer text-center shadow shadow-amber-500/10 active:scale-98"
              >
                🔄 Check Permission Status
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                Notification.requestPermission().then(perm => {
                  setNotificationPermission(perm);
                });
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
            >
              Allow Notifications &rarr;
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleSelectRole = (member) => {
    try {
      const saved = localStorage.getItem('deeplink_credentials');
      if (saved) {
        const creds = JSON.parse(saved);
        if (creds && creds.memberId === member.id && creds.passcode) {
          // Saved credentials match! Instantly log in with celebration
          setIsVerifying(true);
          setSelectedRole(member);
          
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4f46e5', '#06b6d4', '#d946ef', '#10b981']
          });

          setTimeout(() => {
            onJoin(member.name);
          }, 800);
          return;
        }
      }
    } catch (err) {
      console.error('Error reading saved credentials on role select:', err);
    }

    // Default: Ask for passcode
    setSelectedRole(member);
    setPassword('');
    setError('');
  };

  const handleVerifyAndJoin = (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsVerifying(true);
    setError('');

    // Custom passcodes for specific members, default to formula name@321 otherwise
    const expectedPassword = selectedRole.id === 'himanshu'
      ? 'hdr123'
      : selectedRole.id === 'aryan'
        ? 'aryanaryan'
        : `${selectedRole.id}@321`;

    setTimeout(() => {
      if (password === expectedPassword) {
        // Save credentials for "Remember Me" session persistence
        try {
          localStorage.setItem('deeplink_credentials', JSON.stringify({
            username: selectedRole.name,
            memberId: selectedRole.id,
            passcode: password
          }));
        } catch (err) {
          console.error('Error saving credentials to local storage:', err);
        }

        // Trigger celebratory confetti burst!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#06b6d4', '#d946ef', '#10b981']
        });

        setTimeout(() => {
          onJoin(selectedRole.name);
        }, 800);
      } else {
        setError(`Incorrect passcode for ${selectedRole.name}. Please try again!`);
        setIsVerifying(false);
        // Add a micro haptic-shake visual feedback
        const card = document.getElementById('auth-card');
        if (card) {
          card.classList.add('animate-shake');
          setTimeout(() => card.classList.remove('animate-shake'), 500);
        }
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Floating Buggy Game Button in Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={() => setShowGame(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200 text-indigo-600 hover:bg-indigo-50/55 hover:border-indigo-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer font-extrabold text-xs sm:text-sm animate-pulse"
        >
          🎮 Play Buggy Game
        </button>
      </div>

      {showGame && <VehicleGame onClose={() => setShowGame(false)} />}
      {/* Soft color-ambient backdrop blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 md:w-96 h-64 md:h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-64 md:w-96 h-64 md:h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div id="auth-card" className="w-full max-w-2xl z-10 animate-slide-up transition-transform duration-300">
        {/* Rebranded Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/20 mb-4 border border-white/50">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Deep<span className="text-gradient font-black">Link</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Connect deeply with friends instantly. Select your connection and verify your secure link.
          </p>
        </div>

        {/* Rebranded Light-Glass Panel */}
        <div className="glass-panel-glow rounded-3xl p-5 sm:p-8 space-y-6">
          {!selectedRole ? (
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold tracking-wider text-indigo-600 uppercase">
                1. Select Your Friend Identity
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {DEEPLINK_MEMBERS.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectRole(member)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/60 border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-left group cursor-pointer shadow-sm shadow-slate-100/50"
                  >
                    <span className="text-2xl sm:text-3xl bg-slate-100/80 p-2 rounded-xl group-hover:scale-110 group-hover:bg-indigo-100/40 transition-transform duration-300">
                      {member.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-indigo-600 transition-colors">
                        {member.name}
                      </p>
                      <p className="text-2xs sm:text-xs text-slate-400 truncate">
                        {member.status}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back Button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  ← Back to Friends list
                </button>
                <span className="text-2xs text-slate-400 font-semibold uppercase tracking-wider">Identity Gate</span>
              </div>

              {/* Selected Profile Detail */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                <span className="text-4xl bg-indigo-100/50 p-3 rounded-2xl shadow-sm">
                  {selectedRole.avatar}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {selectedRole.name}
                  </h3>
                  <p className="text-xs text-indigo-600 font-semibold">{selectedRole.status}</p>
                </div>
              </div>

              {/* Password entry form */}
              <form onSubmit={handleVerifyAndJoin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
                    {['himanshu', 'aryan'].includes(selectedRole.id)
                      ? "2. Enter Personal Link Passcode"
                      : "2. Enter Personal Link Passcode (Formula: name@321)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={['himanshu', 'aryan'].includes(selectedRole.id) ? "Enter your passcode" : "e.g. nitin@321"}
                      required
                      autoFocus
                      className="w-full glass-input rounded-2xl py-3.5 px-4 pr-12 text-sm focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-3 rounded-xl animate-fade-in">
                    ⚠️ {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || !password}
                  className="w-full relative overflow-hidden group py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Establishing Secure Link...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" /> Verify & Open DeepLink <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-2xs text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Verification Synced
            </span>
            <span className="flex flex-col items-end">
              <span>DeepLink Portal v2.0</span>
              <span className="text-[10px] text-slate-500 font-extrabold mt-0.5">Build by Aryan Maurya</span>
            </span>
          </div>
        </div>

        {/* Creator's Message Card */}
        <div className="mt-6 glass-panel-glow rounded-3xl p-5 sm:p-6 text-slate-700 space-y-3">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            ✨ Message from the Creator
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
            Hello! I am <strong>Aryan</strong> and I created this website. <strong>DeepLink</strong> was built as a dedicated space to connect my friends instantly. In the future, I will be introducing exclusive new features, including an unlimited AI image-generating chatbot and much more! For now, this is our secure platform to connect everyone—stay tuned for future updates!
          </p>
          <div className="pt-2 border-t border-slate-100/60">
            <a 
              href="https://placement-project-delta.vercel.app/source" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-extrabold transition-colors cursor-pointer"
            >
              👑 About Aryan &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
