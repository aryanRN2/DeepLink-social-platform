"use client";

import React, { useState } from 'react';
import { MessageSquare, ArrowRight, ShieldCheck, Eye, EyeOff, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const HANGOUT_MEMBERS = [
  { id: 'aryan', name: 'Aryan', avatar: '👾', status: 'Core Developer' },
  { id: 'nitin', name: 'Nitin', avatar: '⚡', status: 'Speedster' },
  { id: 'niraj', name: 'Niraj', avatar: '🔥', status: 'Firecracker' },
  { id: 'vivek', name: 'Vivek', avatar: '🎩', status: 'The Tactician' },
  { id: 'kartik', name: 'Kartik', avatar: '🦊', status: 'Shadow Hunter' },
  { id: 'anstik', name: 'Anstik', avatar: '👽', status: 'Void Walker' },
  { id: 'anshik', name: 'Anshik', avatar: '🚀', status: 'Rocket Engineer' }
];

export default function JoinScreen({ onJoin }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSelectRole = (member) => {
    setSelectedRole(member);
    setPassword('');
    setError('');
  };

  const handleVerifyAndJoin = (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsVerifying(true);
    setError('');

    // Verification formula: name + "@321" (e.g. nitin@321 for Nitin)
    const expectedPassword = `${selectedRole.id}@321`;

    setTimeout(() => {
      if (password === expectedPassword) {
        // Trigger celebratory confetti burst!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#a78bfa', '#f472b6', '#34d399', '#3b82f6']
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
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 md:w-96 h-64 md:h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-64 md:w-96 h-64 md:h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div id="auth-card" className="w-full max-w-2xl z-10 animate-slide-up transition-transform duration-300">
        {/* Logo Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/25 mb-3 border border-violet-400/20">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Hangout<span className="text-gradient font-bold">Den</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-400">
            Select your identity and authenticate to join the squad hangout.
          </p>
        </div>

        {/* Auth Module Panel */}
        <div className="glass-panel-glow rounded-3xl p-5 sm:p-8 space-y-6">
          {!selectedRole ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold tracking-wider text-violet-400 uppercase">
                1. Select Your Member Identity
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {HANGOUT_MEMBERS.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectRole(member)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-violet-500/30 hover:bg-violet-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-left group cursor-pointer"
                  >
                    <span className="text-2xl sm:text-3xl bg-slate-800 p-2 rounded-xl group-hover:scale-110 group-hover:bg-violet-950/40 transition-transform duration-300">
                      {member.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm sm:text-base group-hover:text-violet-300 transition-colors">
                        {member.name}
                      </p>
                      <p className="text-2xs sm:text-xs text-gray-400 truncate">
                        {member.status}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back Button and Selected Role Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  ← Back to Members
                </button>
                <span className="text-2xs text-gray-500">Identity Gate</span>
              </div>

              {/* Selected Member Detail */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-violet-950/10 border border-violet-500/10">
                <span className="text-4xl bg-violet-950/30 p-3 rounded-2xl">
                  {selectedRole.avatar}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedRole.name}
                  </h3>
                  <p className="text-xs text-violet-400">{selectedRole.status}</p>
                </div>
              </div>

              {/* Password submission form */}
              <form onSubmit={handleVerifyAndJoin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    2. Enter Passcode (Formula: name@321)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. nitin@321"
                      required
                      autoFocus
                      className="w-full glass-input rounded-2xl py-3.5 px-4 pr-12 text-sm focus:ring-1 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-400 font-semibold bg-rose-950/20 border border-rose-500/15 p-3 rounded-xl animate-fade-in">
                    ⚠️ {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || !password}
                  className="w-full relative overflow-hidden group py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Authenticating Secure Channel...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" /> Verify and Join Hangout <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          <div className="border-t border-white/5 pt-4 flex items-center justify-between text-2xs text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> End-to-End Synced
            </span>
            <span>Hangout Den Verification Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
