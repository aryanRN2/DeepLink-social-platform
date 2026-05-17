import React, { useState } from 'react';
import JoinScreen from './components/JoinScreen';
import ChatRoom from './components/ChatRoom';
import SupabaseSetupWizard from './components/SupabaseSetupWizard';
import { isSupabaseConfigured } from './supabaseClient';

export default function App() {
  const [username, setUsername] = useState('');

  // If Supabase credentials are not found in your local environment,
  // we gracefully guide you through the instant setup wizard!
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
        <div className="max-w-7xl mx-auto md:px-4">
          <ChatRoom 
            username={username} 
            onLeave={handleLeave} 
          />
        </div>
      )}
    </div>
  );
}
