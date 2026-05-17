import React, { useState } from 'react';
import { MessageSquare, ArrowRight, ShieldCheck, Eye, EyeOff, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const SQUAD_ROLES = [
  { id: 'aryan', name: 'Aryan', avatar: '👾' },
  { id: 'nitin', name: 'Nitin', avatar: '⚡' },
  { id: 'niraj', name: 'Niraj', avatar: '🔥' },
  { id: 'vivek', name: 'Vivek', avatar: '🎩' },
  { id: 'kartik', name: 'Kartik', avatar: '🦊' },
  { id: 'anstik', name: 'Anstik', avatar: '👽' },
  { id: 'anshik', name: 'Anshik', avatar: '🚀' }
];

export default function JoinScreen({ onJoin }) {
  const [selectedRole, setSelectedRole] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedRole) {
      setError('Please select your role first.');
      return;
    }

    const expectedPassword = `${selectedRole}@321`;
    const enteredPassword = password.trim();

    if (!enteredPassword) {
      setError('Password is required.');
      return;
    }

    // Password Validation check
    if (enteredPassword.toLowerCase() !== expectedPassword.toLowerCase()) {
      setError(`Incorrect password for ${selectedRole}. Remember: name@321`);
      return;
    }

    setIsLoading(true);
    
    // Play celebratory animation on verified login!
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#c084fc', '#6366f1', '#f472b6', '#34d399']
      });

      const matchedRole = SQUAD_ROLES.find(r => r.id === selectedRole);
      onJoin(matchedRole ? matchedRole.name : 'Guest');
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-xl z-10 animate-slide-up">
        {/* Logo and Greeting Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/25 mb-4 border border-violet-400/20">
            <MessageSquare className="h-8 w-8 text-white animate-pulse-subtle" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Hangout<span className="text-gradient">Den</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Select your identity and authenticate to join the squad hangout.
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: Select Role */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                1. Select Your Member Identity
              </label>
              
              {/* Role Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SQUAD_ROLES.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role.id);
                        setError('');
                        setPassword(''); // Clear password on role change
                      }}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600/25 border-violet-500 text-white shadow-lg shadow-violet-500/10 scale-105'
                          : 'bg-slate-900/50 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-900/80 hover:border-white/10'
                      }`}
                    >
                      <span className="text-2xl mb-1.5">{role.avatar}</span>
                      <span className="text-sm font-semibold tracking-wide">{role.name}</span>
                      
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 bg-violet-500 text-white rounded-full p-0.5 animate-fade-in">
                          <UserCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Password Input */}
            {selectedRole && (
              <div className="animate-slide-up space-y-4">
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    2. Enter Credentials for {SQUAD_ROLES.find(r => r.id === selectedRole)?.name}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Hint: name@321"
                      disabled={isLoading}
                      className="block w-full rounded-2xl border-0 bg-slate-900/60 pl-5 pr-12 py-4 text-white placeholder-gray-500 ring-1 ring-inset ring-gray-800 focus:ring-2 focus:ring-inset focus:ring-violet-500 focus:bg-slate-950 transition-all duration-300 outline-none text-base font-medium font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500 mt-2 font-medium">
                    Protected hangout channel. Credentials match <code className="bg-slate-950 px-1 rounded text-violet-400 font-mono">nickname@321</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Error notifications */}
            {error && (
              <div className="text-sm text-rose-400 flex items-center gap-1.5 justify-center py-1.5 px-3 rounded-xl bg-rose-500/5 border border-rose-500/10 animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block animate-ping shrink-0"></span>
                {error}
              </div>
            )}

            {/* Action Trigger */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !selectedRole || !password}
                className="group relative flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-base font-bold text-white hover:from-violet-500 hover:to-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 shadow-lg shadow-violet-600/35 hover:shadow-violet-600/50 transition-all duration-300 disabled:opacity-35 disabled:shadow-none"
              >
                {isLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-violet-200" />
                    Verify and Join Hangout
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Ambient */}
        <div className="mt-8 text-center text-xs text-gray-500">
          Hangout Den Verification Portal • Cloud Synced
        </div>
      </div>
    </div>
  );
}
