import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Users, Smile, LogOut, Radio, Clock, ShieldCheck, 
  Paperclip, Image, Video, Music, Loader2, X, Maximize2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// Helper to assign a dynamic HSL gradient matching a username
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-teal-500 to-emerald-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-fuchsia-500'
  ];
  return colors[Math.abs(hash) % colors.length];
};

export default function ChatRoom({ username, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Lightbox Modal for enlarged images
  const [lightboxImage, setLightboxImage] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const subscriptionRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const popularEmojis = ['❤️', '😂', '🔥', '👍', '🎉', '😮', '💀', '👀', '🥺', '👾'];

  // Scroll anchor helper
  const scrollToBottom = (behavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  // 1. Core Supabase Database & Realtime Subscription Effects
  useEffect(() => {
    // A. Fetch existing message history (limit 100)
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching chat history:', error);
      } else if (data) {
        setMessages(data);
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    };

    fetchHistory();

    // B. Subscribe to new messages inserted into table in real-time
    const messagesChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => {
            // Prevent duplicate logs under hot reloads
            if (prev.some(msg => msg.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    subscriptionRef.current = messagesChannel;

    // C. Setup Supabase Presence to track live users
    const presenceChannel = supabase.channel('presence:hangout', {
      config: {
        presence: {
          key: username,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // Keys represent active usernames in presence channel
        const onlineUsers = Object.keys(state);
        setActiveUsers(onlineUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track when the member joins
          await presenceChannel.track({ online_at: new Date().toISOString() });
          
          // Post system join message
          await supabase.from('messages').insert([
            {
              username: 'System',
              text: `${username} entered the hangout den! 👋`,
              type: 'system'
            }
          ]);
        }
      });

    presenceChannelRef.current = presenceChannel;

    // Cleanup listeners and leave presence safely on unmount
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    };
  }, [username]);

  // Scroll lock trigger
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  // 2. Event actions
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setShowEmojiPicker(false);

    // Insert text row directly to Supabase
    const { error } = await supabase.from('messages').insert([
      {
        username,
        text,
        type: 'user'
      }
    ]);

    if (error) {
      console.error('Error broadcasting message:', error);
    }
  };

  // Upload attachments (images, video, audio)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media category by file MIME type
    let mediaType = '';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    else {
      alert('Supported formats: Images, Videos, and Audio files only.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10); // Start progress bar

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      setUploadProgress(35);

      // Upload file directly into Supabase 'chat-media' bucket
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Fetch public accessible URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      setUploadProgress(90);

      // Write row to messages database containing URL and MIME category
      const { error: dbError } = await supabase.from('messages').insert([
        {
          username,
          text: `Sent a ${mediaType}`,
          media_url: publicUrl,
          media_type: mediaType,
          type: 'user'
        }
      ]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);

    } catch (err) {
      console.error('Media upload error:', err);
      alert('Upload failed: Ensure your chat-media bucket exists and allows anonymous public access policies.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEmojiClick = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const handleLogoutClick = async () => {
    // Post system exit message
    await supabase.from('messages').insert([
      {
        username: 'System',
        text: `${username} left the hangout. 🚪`,
        type: 'system'
      }
    ]);
    
    onLeave();
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden relative font-sans">
      
      {/* A. PREMIUM ROOM HEADER */}
      <header className="glass-panel sticky top-0 z-20 flex h-20 items-center justify-between px-6 border-b border-white/5 select-none shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400">
            <Radio className="h-5 w-5 animate-pulse-subtle" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
              Hangout <span className="text-gradient">Den</span>
            </h1>
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Supabase Synced
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/50 border border-white/5 px-3 py-1.5 rounded-full text-xs text-gray-400 font-medium">
            <Users className="w-3.5 h-3.5 text-violet-400" />
            <span>{activeUsers.length} Online</span>
          </div>

          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-gray-300 text-sm font-semibold transition-all duration-300 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave Den</span>
          </button>
        </div>
      </header>

      {/* B. MAIN ROOM SCREEN */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* CHAT MESSAGES SCROLLER */}
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-950/20">
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-gray-600 mb-4 animate-bounce-subtle">
                  💬
                </div>
                <h3 className="text-lg font-semibold text-white">No messages yet</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                  Break the ice by posting a message or wave to your friends!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.username === username;
                const isSystem = msg.type === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2 animate-fade-in">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900/60 border border-white/5 text-xs text-violet-400/90 font-medium tracking-wide">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 animate-slide-up ${
                      isSelf ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isSelf && (
                      <div className={`h-8 w-8 rounded-xl bg-gradient-to-tr ${stringToColor(msg.username)} flex items-center justify-center font-bold text-xs text-white shadow-md shadow-black/30 shrink-0`}>
                        {msg.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isSelf ? 'items-end' : 'items-start'}`}>
                      {!isSelf && (
                        <span className="text-xs text-gray-400 font-bold mb-1 ml-1 tracking-wide">
                          {msg.username}
                        </span>
                      )}

                      {/* Message bubble card */}
                      <div
                        className={`rounded-2xl px-4.5 py-3 shadow-md border ${
                          isSelf
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-500 text-white rounded-br-none'
                            : 'bg-slate-900/80 border-white/5 text-gray-100 rounded-bl-none'
                        }`}
                      >
                        {/* 1. TEXT CONTENT (If present) */}
                        {msg.text && (!msg.media_url) && (
                          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                            {msg.text}
                          </p>
                        )}

                        {/* 2. MEDIA UPLOAD CONTENTS */}
                        {msg.media_url && (
                          <div className="space-y-1 mt-0.5">
                            
                            {/* IMAGE MEDIA */}
                            {msg.media_type === 'image' && (
                              <div 
                                onClick={() => setLightboxImage(msg.media_url)}
                                className="relative rounded-xl overflow-hidden border border-white/10 group cursor-zoom-in max-w-sm"
                              >
                                <img 
                                  src={msg.media_url} 
                                  alt="Shared content" 
                                  className="max-h-60 object-contain w-full bg-slate-950/80 transition-transform duration-300 group-hover:scale-105" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                  <Maximize2 className="w-6 h-6 text-white" />
                                </div>
                              </div>
                            )}

                            {/* VIDEO MEDIA */}
                            {msg.media_type === 'video' && (
                              <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 max-w-sm">
                                <video 
                                  src={msg.media_url} 
                                  controls 
                                  className="max-h-60 w-full object-contain"
                                  preload="metadata"
                                />
                              </div>
                            )}

                            {/* AUDIO MEDIA */}
                            {msg.media_type === 'audio' && (
                              <div className="rounded-xl p-2 bg-slate-950/80 border border-white/10 max-w-xs">
                                <audio 
                                  src={msg.media_url} 
                                  controls 
                                  className="w-full h-8 outline-none"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-500 font-semibold mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {isSelf && (
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-black/30 shrink-0">
                        Me
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* C. CHAT INPUT BAR WITH FILE UPLOADERS */}
          <footer className="glass-panel border-t border-white/5 p-4.5 relative">
            
            {/* Progress overlay for media uploading */}
            {isUploading && (
              <div className="absolute inset-x-0 bottom-full bg-slate-900 border-t border-violet-500 p-3 flex items-center gap-3 text-xs text-gray-300 font-medium animate-fade-in shadow-lg">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="flex-1">Uploading media file... {uploadProgress}%</span>
                <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-violet-500 h-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Popular Emojis tray */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-4 mb-2 bg-slate-950/95 border border-white/10 p-2.5 rounded-2xl flex gap-1.5 shadow-2xl z-10 animate-fade-in backdrop-blur-xl">
                {popularEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="h-9 w-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-lg active:scale-90 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
              
              {/* Media file picker button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,video/*,audio/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-12 w-12 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-50"
                title="Send photo, video or audio"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Emoji tray button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-300 cursor-pointer shrink-0 ${
                  showEmojiPicker 
                    ? 'bg-violet-600/20 border-violet-500 text-violet-400' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                <Smile className="w-5.5 h-5.5" />
              </button>

              {/* Chat Input box */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message as ${username}...`}
                disabled={isUploading}
                className="flex-1 h-12 rounded-xl bg-slate-900/60 border border-white/5 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-slate-950 transition-all font-medium text-[15px] disabled:opacity-50"
              />

              {/* Glow sender button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isUploading}
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/20 hover:shadow-violet-600/35 transition-all duration-300 disabled:opacity-40 disabled:shadow-none shrink-0 cursor-pointer"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </footer>
        </main>

        {/* SIDEBAR ONLINE SQUAD LIST */}
        <aside className="hidden lg:flex w-72 flex-col border-l border-white/5 bg-slate-950/40 select-none">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" /> Hangout Squad
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Currently active online
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeUsers.map((user, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 ${
                  user === username 
                    ? 'bg-violet-600/10 border-violet-500/30' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${user === username ? 'from-violet-500 to-fuchsia-500' : stringToColor(user)} flex items-center justify-center font-bold text-xs text-white`}>
                  {user.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold text-gray-200 truncate">
                    {user}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    {user === username ? 'You (Online)' : 'Member'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>

      {/* D. LIGHTBOX IMAGE OVERLAY MODAL */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white cursor-pointer hover:bg-white/15 active:scale-95 transition-all"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Shared media enlarged" 
            className="max-h-[90svh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/5 animate-scale-in"
            onClick={(e) => e.stopPropagation()} // Stop click closing
          />
        </div>
      )}

    </div>
  );
}
