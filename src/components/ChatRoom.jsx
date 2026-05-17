"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Paperclip, LogOut, Users, Image as ImageIcon, 
  Play, Volume2, X, AlertCircle, ShieldAlert, CheckCircle2, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const ROLE_AVATARS = {
  Aryan: '👾',
  Nitin: '⚡',
  Niraj: '🔥',
  Vivek: '🎩',
  Kartik: '🦊',
  Anstik: '👽',
  Anshik: '🚀'
};

const ROLE_COLORS = {
  Aryan: 'text-violet-400 border-violet-500/20 bg-violet-500/5',
  Nitin: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  Niraj: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  Vivek: 'text-sky-400 border-sky-500/20 bg-sky-500/5',
  Kartik: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
  Anstik: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
  Anshik: 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5'
};

export default function ChatRoom({ username, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'members' for mobile toggle
  const [lightboxImage, setLightboxImage] = useState(null);
  const [dbError, setDbError] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history & subscribe to Realtime listeners
  useEffect(() => {
    if (!supabase) return;

    // 1. Fetch historical messages
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('timestamp', { ascending: true })
          .limit(100);

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching chat history:', err);
        setDbError('Failed to fetch message history. Please check if the SQL script has been run in your Supabase dashboard.');
      }
    };

    fetchHistory();

    // 2. Realtime Database Subscription
    const messageChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime database connection established!');
        }
      });

    // 3. Supabase Presence Tracking (Online members sync)
    const presenceChannel = supabase.channel('room:hangout', {
      config: { presence: { key: username } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const usersList = [];
        
        Object.keys(state).forEach((key) => {
          usersList.push({
            username: key,
            joinedAt: state[key][0]?.onlineAt || new Date().toISOString()
          });
        });
        
        setActiveUsers(usersList);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log(`${key} joined the channel`);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log(`${key} left the channel`);
      });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          onlineAt: new Date().toISOString()
        });
      }
    });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [username]);

  // Send standard text message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !supabase) return;

    const textToSend = inputText;
    setInputText('');

    try {
      const { error } = await supabase.from('messages').insert([
        {
          username,
          text: textToSend,
          type: 'user'
        }
      ]);
      if (error) throw error;
    } catch (err) {
      console.error('Error inserting message:', err);
      setDbError('Message failed to transmit. Verify database connection.');
    }
  };

  // Upload attachment & send media message
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    setUploading(true);
    setUploadProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `chat-media/${fileName}`;

    try {
      // 1. Upload to Supabase chat-media bucket
      const { data, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Determine Media Category
      let mediaType = 'other';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      // 3. Insert message linking to uploaded media
      const { error: dbError } = await supabase.from('messages').insert([
        {
          username,
          text: `Shared a ${mediaType}`,
          type: 'user',
          media_url: publicUrl,
          media_type: mediaType
        }
      ]);

      if (dbError) throw dbError;
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Media Upload Failed! Make sure you created a public bucket named "chat-media" in Storage with read/write access policies.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Trigger hidden input click
  const triggerAttachment = () => {
    fileInputRef.current?.click();
  };

  // Format message timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen text-slate-100 overflow-hidden font-sans relative md:p-4">
      {/* ⚠️ Database Schema Sync Error Notice */}
      {dbError && (
        <div className="absolute top-4 left-4 right-4 z-50 p-4 rounded-2xl bg-rose-950/90 border border-rose-500/20 shadow-2xl flex items-start gap-3 animate-fade-in backdrop-blur-md">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Supabase Schema Error Detected</h4>
            <p className="text-xs text-rose-300 mt-1">{dbError}</p>
          </div>
          <button onClick={() => setDbError(null)} className="p-1 rounded-lg hover:bg-white/10 text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 👥 Left Sidebar Panel (Members list) - Fixed on Desktop, Drawer Overlay on Mobile */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel-glow border-r border-white/5 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out transform
        md:relative md:translate-x-0 md:rounded-3xl md:border-r-0 md:shadow-none
        ${activeTab === 'members' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              <span className="font-extrabold text-sm uppercase tracking-wider text-gray-200">Active Squad</span>
            </div>
            {/* Mobile Sidebar Close Button */}
            <button 
              onClick={() => setActiveTab('chat')} 
              className="md:hidden p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-violet-500/30 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Members List Container */}
          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
            {activeUsers.map((user) => {
              const avatar = ROLE_AVATARS[user.username] || '👤';
              const colorClasses = ROLE_COLORS[user.username] || 'text-slate-300 border-white/5 bg-white/5';
              return (
                <div 
                  key={user.username}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${colorClasses}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{avatar}</span>
                    <span className="font-bold text-xs truncate">{user.username}</span>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current logged user block & LogOut */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{ROLE_AVATARS[username] || '👾'}</span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white truncate">{username}</p>
              <p className="text-3xs text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Online
              </p>
            </div>
          </div>
          <button 
            onClick={onLeave}
            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 transition-all cursor-pointer"
            title="Leave Hangout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 🗨️ Right Main Chat Module */}
      <main className="flex-1 flex flex-col h-full min-w-0 md:pl-4 relative">
        {/* Mobile Header Bar */}
        <header className="glass-panel-glow md:rounded-3xl border-b border-white/5 md:border-b-0 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle Button */}
            <button 
              onClick={() => setActiveTab('members')}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-violet-400 hover:text-violet-300"
            >
              <Users className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">Hangout Room</h2>
              <p className="text-3xs sm:text-2xs text-gray-400 flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {activeUsers.length} squad {activeUsers.length === 1 ? 'member' : 'members'} online
              </p>
            </div>
          </div>
          <button 
            onClick={onLeave}
            className="text-xs text-rose-400 border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/15 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            Leave <LogOut className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* Backdrop overlay for mobile drawer */}
        {activeTab === 'members' && (
          <div 
            onClick={() => setActiveTab('chat')} 
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
        )}

        {/* 💬 Scrollable Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <span className="text-5xl animate-bounce mb-3">👾</span>
              <h3 className="font-bold text-white text-base">Hangout Den is Empty</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                You're the first member here! Send a greeting message or upload a media file to start the party.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.username === username;
              const senderColor = ROLE_COLORS[msg.username] || 'text-slate-300 border-white/5 bg-white/5';
              const avatar = ROLE_AVATARS[msg.username] || '👤';

              return (
                <div 
                  key={msg.id || msg.timestamp}
                  className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${isSelf ? 'ml-auto flex-row-reverse' : ''} animate-fade-in`}
                >
                  {/* Sender Avatar */}
                  <span className="text-2xl shrink-0 self-end mb-1">{avatar}</span>

                  <div className="space-y-1">
                    {/* Username and Time */}
                    <div className={`flex items-center gap-1.5 text-3xs ${isSelf ? 'justify-end' : ''}`}>
                      <span className="font-extrabold text-white uppercase tracking-wider">{msg.username}</span>
                      <span className="text-gray-500">{formatTime(msg.timestamp)}</span>
                    </div>

                    {/* Speech Bubble Card */}
                    <div className={`
                      p-3 rounded-2xl text-xs sm:text-sm leading-relaxed border select-text
                      ${isSelf 
                        ? 'bg-violet-950/20 border-violet-500/20 text-slate-100 rounded-br-none' 
                        : 'bg-slate-900/60 border-white/5 text-slate-200 rounded-bl-none'}
                    `}>
                      {/* Render text if present */}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      {/* Render Attachments dynamically */}
                      {msg.media_url && (
                        <div className="mt-2.5 max-w-full">
                          {msg.media_type === 'image' && (
                            <div 
                              onClick={() => setLightboxImage(msg.media_url)}
                              className="relative rounded-xl overflow-hidden border border-white/10 hover:border-violet-500/40 hover:scale-[1.01] transition-all cursor-pointer max-w-full sm:max-w-xs"
                            >
                              <img 
                                src={msg.media_url} 
                                alt="shared content" 
                                className="object-cover max-h-48 w-full"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ImageIcon className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}

                          {msg.media_type === 'video' && (
                            <div className="rounded-xl overflow-hidden border border-white/10 max-w-full sm:max-w-xs bg-black">
                              <video 
                                src={msg.media_url} 
                                controls 
                                className="max-h-48 w-full object-contain"
                              />
                            </div>
                          )}

                          {msg.media_type === 'audio' && (
                            <div className="rounded-xl border border-white/10 p-2.5 bg-slate-950/40 flex items-center gap-2.5 max-w-full sm:max-w-xs">
                              <div className="h-8 w-8 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
                                <Volume2 className="w-4 h-4 text-violet-400" />
                              </div>
                              <audio src={msg.media_url} controls className="w-48 h-8 max-w-full" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 🎛️ Input Footer Controls */}
        <footer className="p-4 z-10">
          <div className="glass-panel-glow rounded-3xl p-2">
            {/* File Upload Progress Indicator */}
            {uploading && (
              <div className="px-3 pb-2 flex items-center gap-2 border-b border-white/5 mb-2 animate-pulse">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                <span className="text-3xs font-extrabold uppercase text-violet-400 tracking-wider">
                  Syncing file payload to cloud storage...
                </span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Secret attachment file inputs */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleMediaUpload}
                accept="image/*,video/*,audio/*"
                className="hidden" 
              />
              
              {/* Attachment Clip Button */}
              <button
                type="button"
                onClick={triggerAttachment}
                disabled={uploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 border border-white/5 text-gray-400 hover:text-white hover:border-violet-500/30 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                title="Send Media (Image/Video/Audio)"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>

              {/* Text Input Block */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Send secure encrypted stream..."
                disabled={uploading}
                className="flex-1 glass-input rounded-2xl py-3 px-4 text-xs sm:text-sm focus:ring-0 focus:border-violet-500"
              />

              {/* Action Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || uploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        </footer>
      </main>

      {/* 🖼️ Fullscreen Image Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-rose-500/30 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Main Lightbox Frame */}
          <img 
            src={lightboxImage} 
            alt="expanded lightbox preview" 
            className="max-h-[90vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/5"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
          />
        </div>
      )}
    </div>
  );
}
