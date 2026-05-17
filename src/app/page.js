"use client";

import React, { useState } from 'react';
import JoinScreen from '../components/JoinScreen';
import ChatRoom from '../components/ChatRoom';
import SupabaseSetupWizard from '../components/SupabaseSetupWizard';
import { isSupabaseConfigured } from '../supabaseClient';

export default function Home() {
  const [username, setUsername] = useState('');

  // If Supabase environment variables are missing,
  // display the beautiful visual onboarding setup guide.
  if (!isSupabaseConfigured) {
    return <SupabaseSetupWizard />;
  }

  const handleJoin = (chosenUsername) => {
    setUsername(chosenUsername);
  };

  const handleLeave = () => {
    setUsername('');
  };

  return (
    <div className="min-h-screen text-slate-100 selection:bg-violet-600/40 select-none">
      {!username ? (
        <JoinScreen onJoin={handleJoin} />
      ) : (
        <div className="max-w-7xl mx-auto md:px-4 animate-fade-in">
          <ChatRoom 
            username={username} 
            onLeave={handleLeave} 
          />
        </div>
      )}
    </div>
  );
}
