"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Paperclip, LogOut, Users, Image as ImageIcon, 
  Play, Volume2, X, ShieldAlert, CheckCircle2, Share2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const ROLE_AVATARS = {
  Aryan: '👾',
  Nitin: '⚡',
  Niraj: '🔥',
  Vivek: '🎩',
  Kartik: '🦊',
  Anstik: '👽',
  Anshik: '🚀',
  Ayush: '👑',
  'Himanshu HDR (Bhaiya)': '🌟',
  'Himanshu HDR': '🌟',
  Himanshu: '🌟'
};

const ROLE_COLORS = {
  Aryan: 'text-indigo-600 border-indigo-100 bg-indigo-50/40',
  Nitin: 'text-amber-600 border-amber-100 bg-amber-50/40',
  Niraj: 'text-rose-600 border-rose-100 bg-rose-50/40',
  Vivek: 'text-sky-600 border-sky-100 bg-sky-50/40',
  Kartik: 'text-orange-600 border-orange-100 bg-orange-50/40',
  Anstik: 'text-teal-600 border-teal-100 bg-teal-50/40',
  Anshik: 'text-fuchsia-600 border-fuchsia-100 bg-fuchsia-50/40',
  Ayush: 'text-emerald-600 border-emerald-100 bg-emerald-50/40',
  'Himanshu HDR (Bhaiya)': 'text-violet-600 border-violet-100 bg-violet-50/40',
  'Himanshu HDR': 'text-violet-600 border-violet-100 bg-violet-50/40',
  Himanshu: 'text-violet-600 border-violet-100 bg-violet-50/40'
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
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Pagination & Lazy loading state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  // Session/Device Identity synchronization setup
  const [clientSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('deeplink_session_id');
      if (!id) {
        id = 'session-' + Math.random().toString(36).substring(2) + '-' + Date.now();
        sessionStorage.setItem('deeplink_session_id', id);
      }
      return id;
    }
    return '';
  });

  const sentMessageIdsRef = useRef(new Set());
  const isInitialPresenceSyncedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialPresenceSyncedRef.current = true;
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const playMessageChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      oscillator.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5 note
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.error('Audio synthesizer not allowed by browser autoplay rules:', err);
    }
  };

  const playJoinChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        
        gain.gain.setValueAtTime(0.06, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);
        
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.35);
      });
    } catch (err) {
      console.error('Audio synthesizer failed:', err);
    }
  };

  const playLeaveChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const notes = [783.99, 659.25, 523.25]; // G5, E5, C5
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        
        gain.gain.setValueAtTime(0.05, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);
        
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.35);
      });
    } catch (err) {
      console.error('Audio synthesizer failed:', err);
    }
  };

  const generateUUID = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Load older messages as you scroll up
  const loadOlderMessages = async () => {
    if (!supabase || loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    const container = chatContainerRef.current;
    const scrollHeightBefore = container ? container.scrollHeight : 0;
    const scrollTopBefore = container ? container.scrollTop : 0;

    const oldestTimestamp = messages[0]?.timestamp;
    if (!oldestTimestamp) {
      setLoadingMore(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .lt('timestamp', oldestTimestamp)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const reversed = [...data].reverse();
        
        // Temporarily bypass smooth scrolling during historical prepending
        if (container) {
          container.style.scrollBehavior = 'auto';
        }
        
        setMessages((prev) => [...reversed, ...prev]);

        if (data.length < 20) {
          setHasMore(false);
        }

        // Adjust scroll position after prepending
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - scrollHeightBefore + scrollTopBefore;
            // Restore smooth scrolling for new messages
            container.style.scrollBehavior = 'smooth';
          }
        }, 50);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (container.scrollTop === 0) {
      loadOlderMessages();
    }
  };

  // Smart scrolling synchronization manager
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastMessageIdRef.current) {
        const container = chatContainerRef.current;
        const isNearBottom = container 
          ? (container.scrollHeight - container.scrollTop - container.clientHeight < 300) 
          : true;
        const isInitial = !lastMessageIdRef.current;

        lastMessageIdRef.current = lastMsg.id;

        if (isNearBottom || isInitial) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    }
  }, [messages]);

  // Load chat history & subscribe to Realtime listeners
  useEffect(() => {
    if (!supabase) return;

    // 1. Fetch latest 20 messages for initial load
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(20);

        if (error) throw error;

        const chronologicalData = data ? [...data].reverse() : [];
        setMessages(chronologicalData);
        
        if (chronologicalData.length < 20) {
          setHasMore(false);
        }
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
          const newMsg = payload.new;
          setMessages((prev) => [...prev, newMsg]);

          // Play chime & push system notification if sent from another device/session
          const isMyOwnSessionMsg = sentMessageIdsRef.current.has(newMsg.id);
          
          if (!isMyOwnSessionMsg) {
            playMessageChime();

            // Trigger system push notification banner
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                let notificationBody = newMsg.text || 'Shared an attachment';
                if (newMsg.text && newMsg.text.startsWith('Shared a document: ')) {
                  notificationBody = newMsg.text.replace('Shared a document: ', '📄 ');
                }

                new Notification(`DeepLink — ${newMsg.username}`, {
                  body: notificationBody,
                  icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
                  tag: `deeplink-message-${newMsg.id}`,
                  renotify: true
                });
              } catch (e) {
                console.error('Error triggering notification:', e);
              }
            }
          }
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
          const sessions = state[key] || [];
          if (sessions.length > 0) {
            usersList.push({
              username: key,
              joinedAt: sessions[0]?.onlineAt || new Date().toISOString(),
              devicesCount: sessions.length
            });
          }
        });
        
        setActiveUsers(usersList);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`${key} joined the channel`, newPresences);
        if (isInitialPresenceSyncedRef.current && newPresences) {
          newPresences.forEach((pres) => {
            if (pres.sessionId !== clientSessionId) {
              playJoinChime();
              
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  const avatar = ROLE_AVATARS[key] || '👤';
                  new Notification(`DeepLink — Activity`, {
                    body: `${avatar} ${key} joined the chatroom`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
                    tag: `deeplink-join-${key}-${pres.sessionId}`,
                    renotify: true
                  });
                } catch (e) {
                  console.error('Error triggering join notification:', e);
                }
              }
            }
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`${key} left the channel`, leftPresences);
        if (isInitialPresenceSyncedRef.current && leftPresences) {
          leftPresences.forEach((pres) => {
            if (pres.sessionId !== clientSessionId) {
              playLeaveChime();
              
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  const avatar = ROLE_AVATARS[key] || '👤';
                  new Notification(`DeepLink — Activity`, {
                    body: `${avatar} ${key} left the chatroom`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
                    tag: `deeplink-leave-${key}-${pres.sessionId}`,
                    renotify: true
                  });
                } catch (e) {
                  console.error('Error triggering leave notification:', e);
                }
              }
            }
          });
        }
      });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          onlineAt: new Date().toISOString(),
          sessionId: clientSessionId
        });
      }
    });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [username, clientSessionId]);

  // Send standard text message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !supabase) return;

    const textToSend = inputText;
    setInputText('');
    const replyContext = replyingTo;
    setReplyingTo(null);

    try {
      const messageId = generateUUID();
      sentMessageIdsRef.current.add(messageId);

      const payload = {
        id: messageId,
        username,
        text: textToSend,
        type: 'user'
      };

      if (replyContext) {
        payload.reply_to_id = replyContext.id;
        payload.reply_to_text = replyContext.text;
        payload.reply_to_username = replyContext.username;
      }

      const { error } = await supabase.from('messages').insert([payload]);
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
      else if (
        file.type === 'application/pdf' ||
        file.type.startsWith('application/vnd.') ||
        file.type.startsWith('text/') ||
        ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'csv'].includes(fileExt.toLowerCase())
      ) {
        mediaType = 'document';
      }

      const sharedMessageText = mediaType === 'document' || mediaType === 'other'
        ? `Shared a document: ${file.name}`
        : `Shared a ${mediaType}`;

      const messageId = generateUUID();
      sentMessageIdsRef.current.add(messageId);

      const payload = {
        id: messageId,
        username,
        text: sharedMessageText,
        type: 'user',
        media_url: publicUrl,
        media_type: mediaType
      };

      if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
        payload.reply_to_text = replyingTo.text;
        payload.reply_to_username = replyingTo.username;
        setReplyingTo(null);
      }

      // 3. Insert message linking to uploaded media
      const { error: dbError } = await supabase.from('messages').insert([payload]);

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
    date.setHours(date.getHours()); // Keep original timestamp timezone representation
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen text-slate-800 overflow-hidden font-sans relative md:p-4 bg-slate-50/50">
      {/* ⚠️ Database Schema Sync Error Notice */}
      {dbError && (
        <div className="absolute top-4 left-4 right-4 z-50 p-4 rounded-2xl bg-rose-50 border border-rose-100 shadow-2xl flex items-start gap-3 animate-fade-in backdrop-blur-md">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800">Supabase Schema Error</h4>
            <p className="text-xs text-rose-600 mt-1">{dbError}</p>
          </div>
          <button onClick={() => setDbError(null)} className="p-1 rounded-lg hover:bg-slate-100 text-rose-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 👥 Left Sidebar Panel (Members list) - Light Glassmorphism Card */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel-glow border-r border-slate-200/50 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out transform
        md:relative md:translate-x-0 md:rounded-3xl md:border-r-0 md:shadow-lg md:shadow-slate-100/50
        ${activeTab === 'members' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-500">Connected Friends</span>
            </div>
            {/* Mobile Sidebar Close Button */}
            <button 
              onClick={() => setActiveTab('chat')} 
              className="md:hidden p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Members List Container */}
          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1 scrollbar-hidden">
            {activeUsers.map((user) => {
              const avatar = ROLE_AVATARS[user.username] || '👤';
              const colorClasses = ROLE_COLORS[user.username] || 'text-slate-700 border-slate-100 bg-slate-50/50';
              return (
                <div 
                  key={user.username}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all shadow-sm ${colorClasses}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{avatar}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-xs truncate block">{user.username}</span>
                      {user.devicesCount > 1 && (
                        <span className="text-4xs text-slate-400 font-semibold uppercase tracking-wider block">
                          {user.devicesCount} devices active
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current logged user block & LogOut */}
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">{ROLE_AVATARS[username] || '👾'}</span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-800 truncate">{username}</p>
                <p className="text-3xs text-emerald-600 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Online
                </p>
              </div>
            </div>
            <button 
              onClick={onLeave}
              className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 hover:text-rose-600 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Leave Chatroom"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-slate-400 font-extrabold tracking-wider text-center border-t border-slate-100/60 pt-2.5">
            ⚡ Build by <span className="text-indigo-600">Aryan Maurya</span>
          </div>
        </div>
      </aside>

      {/* 🗨️ Right Main Chat Module */}
      <main className="flex-1 flex flex-col h-full min-w-0 md:pl-4 relative">
        {/* Mobile Header Bar */}
        <header className="glass-panel-glow md:rounded-3xl border-b border-slate-100 md:border-b-0 p-4 flex items-center justify-between z-10 md:shadow-lg md:shadow-slate-100/50">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle Button */}
            <button 
              onClick={() => setActiveTab('members')}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-indigo-600 hover:text-indigo-700 shadow-sm"
            >
              <Users className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow shadow-indigo-500/10 border border-white/50 shrink-0">
                <Share2 className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight">DeepLink Room</h2>
                <p className="text-3xs sm:text-2xs text-slate-400 flex items-center gap-1.5">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {activeUsers.length} online connection{activeUsers.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLeave}
            className="text-xs text-rose-500 border border-rose-100 bg-rose-50/50 hover:bg-rose-100/50 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold shadow-sm"
          >
            Disconnect <LogOut className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* Backdrop overlay for mobile drawer */}
        {activeTab === 'members' && (
          <div 
            onClick={() => setActiveTab('chat')} 
            className="md:hidden fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-sm transition-opacity duration-300"
          />
        )}

        {/* 💬 Scrollable Messages Stream */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden scroll-smooth"
        >
          {loadingMore && (
            <div className="flex items-center justify-center py-2 animate-pulse">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2" />
              <span className="text-3xs font-extrabold uppercase text-indigo-600 tracking-wider">
                Retrieving message history...
              </span>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
              <span className="text-5xl animate-bounce mb-4">🔗</span>
              <h3 className="font-extrabold text-slate-800 text-base">DeepLink is Open</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                You're the first friend connected here! Send a greeting or share a media file to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.username === username;
              const avatar = ROLE_AVATARS[msg.username] || '👤';

              return (
                <div 
                  key={msg.id || msg.timestamp}
                  id={`msg-${msg.id}`}
                  className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${isSelf ? 'ml-auto flex-row-reverse' : ''} transition-all duration-300 rounded-2xl animate-fade-in`}
                >
                  {/* Sender Avatar */}
                  <span className="text-2xl shrink-0 self-end mb-1">{avatar}</span>

                  <div className="space-y-1">
                    {/* Username and Time */}
                    <div className={`flex items-center gap-1.5 text-3xs ${isSelf ? 'justify-end' : ''}`}>
                      <span className="font-extrabold text-slate-800 tracking-wider">{msg.username}</span>
                      <span className="text-slate-400">{formatTime(msg.timestamp)}</span>
                      <button
                        onClick={() => setReplyingTo({
                          id: msg.id,
                          username: msg.username,
                          text: msg.text || `Shared a ${msg.media_type || 'file'}`
                        })}
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer ml-1 transition-all"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Speech Bubble Card */}
                    <div className={`
                      p-3 rounded-2xl text-xs sm:text-sm leading-relaxed border select-text shadow-sm
                      ${isSelf 
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-br-none border-transparent shadow-indigo-100' 
                        : 'bg-white border-slate-200/60 text-slate-800 rounded-bl-none shadow-slate-100'}
                    `}>
                      {/* Render Replied Message Header inside bubble */}
                      {msg.reply_to_text && (
                        <div 
                          onClick={() => {
                            const element = document.getElementById(`msg-${msg.reply_to_id}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // Highlight effect
                              element.classList.add('bg-indigo-50', 'ring-2', 'ring-indigo-500/20');
                              setTimeout(() => {
                                element.classList.remove('bg-indigo-50', 'ring-2', 'ring-indigo-500/20');
                              }, 1500);
                            }
                          }}
                          className={`
                            p-2 rounded-lg text-3xs leading-tight mb-2 border-l-2 truncate max-w-full cursor-pointer hover:opacity-90 active:scale-99 transition-all
                            ${isSelf 
                              ? 'bg-white/10 border-white/50 text-indigo-100' 
                              : 'bg-slate-50 border-indigo-500 text-slate-500'}
                          `}
                        >
                          <p className="font-extrabold uppercase tracking-wider text-4xs opacity-85 mb-0.5">
                            Replying to {msg.reply_to_username}
                          </p>
                          <p className="italic truncate">{msg.reply_to_text}</p>
                        </div>
                      )}

                      {/* Render text if present */}
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      {/* Render Attachments dynamically */}
                      {msg.media_url && (
                        <div className="mt-2.5 max-w-full">
                          {msg.media_type === 'image' && (
                            <div 
                              onClick={() => setLightboxImage(msg.media_url)}
                              className="relative rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 hover:scale-[1.01] transition-all cursor-pointer max-w-full sm:max-w-xs"
                            >
                              <img 
                                src={msg.media_url} 
                                alt="shared content" 
                                className="object-cover max-h-48 w-full"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ImageIcon className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}

                          {msg.media_type === 'video' && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 max-w-full sm:max-w-xs bg-black">
                              <video 
                                src={msg.media_url} 
                                controls 
                                className="max-h-48 w-full object-contain"
                              />
                            </div>
                          )}

                          {msg.media_type === 'audio' && (
                            <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50 flex items-center gap-2.5 max-w-full sm:max-w-xs">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                <Volume2 className="w-4 h-4 text-indigo-600" />
                              </div>
                              <audio src={msg.media_url} controls className="w-48 h-8 max-w-full" />
                            </div>
                          )}

                          {(msg.media_type === 'document' || msg.media_type === 'other') && (
                            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 flex items-center justify-between gap-3 max-w-full sm:max-w-xs shadow-sm">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                  <span className="text-lg">📄</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]" title={msg.text}>
                                    {msg.text ? msg.text.replace('Shared a document: ', '') : 'Document'}
                                  </p>
                                  <p className="text-3xs text-slate-400 font-semibold uppercase tracking-wider">
                                    {msg.media_type} File
                                  </p>
                                </div>
                              </div>
                              <a 
                                href={msg.media_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                download
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-extrabold transition-all shrink-0 cursor-pointer shadow-sm shadow-indigo-100"
                              >
                                Open
                              </a>
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
          <div className="glass-panel-glow rounded-3xl p-2 md:shadow-lg md:shadow-slate-100/50">
            {/* File Upload Progress Indicator */}
            {uploading && (
              <div className="px-3 pb-2 flex items-center gap-2 border-b border-slate-100 mb-2 animate-pulse">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <span className="text-3xs font-extrabold uppercase text-indigo-600 tracking-wider">
                  Syncing file payload to DeepLink storage...
                </span>
              </div>
            )}

            {/* Replying To Preview Panel */}
            {replyingTo && (
              <div className="px-3 py-2 flex items-center justify-between gap-3 border-b border-slate-100 mb-2 animate-fade-in bg-indigo-50/40 rounded-2xl">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs">💬</span>
                  <div className="min-w-0">
                    <p className="text-3xs font-extrabold text-indigo-600 uppercase tracking-wider">
                      Replying to {replyingTo.username}
                    </p>
                    <p className="text-xs text-slate-600 truncate max-w-[200px] sm:max-w-md font-medium">
                      {replyingTo.text}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Secret attachment file inputs */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleMediaUpload}
                className="hidden" 
              />
              
              {/* Attachment Clip Button */}
              <button
                type="button"
                onClick={triggerAttachment}
                disabled={uploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-indigo-300 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                title="Send Media or Documents (PDF, ZIP, DOC...)"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>

              {/* Text Input Block */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message to the squad..."
                disabled={uploading}
                className="flex-1 glass-input rounded-2xl py-3 px-4 text-xs sm:text-sm focus:ring-0 focus:border-indigo-500 text-slate-800 bg-white/90 shadow-sm"
              />

              {/* Action Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || uploading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white border border-slate-200 hover:border-rose-500/30 text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Main Lightbox Frame */}
          <img 
            src={lightboxImage} 
            alt="expanded lightbox preview" 
            className="max-h-[90vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/40"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
          />
        </div>
      )}
    </div>
  );
}
