import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  AlertCircle,
  Activity,
  UploadCloud,
  Terminal,
  Square,
  Globe,
  X,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { assistantService } from '../services/assistantService';
import { executeClientAction } from '../lib/actionHandler';
import { Conversation, Message } from '../types/conversation';
import { ChatMessage } from '../components/ChatMessage';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { NucleusCore } from '../components/NucleusCore';

interface LogEntry {
  time: string;
  type: 'SYS' | 'LOG' | 'INFO' | 'USER' | 'AI' | 'FILE';
  message: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activeCenterTab, setActiveCenterTab] = useState<'news' | 'chat'>('news');
  const [newsDismissed, setNewsDismissed] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);

  // Activity logs matching the reference image terminal stream
  const [activityLogs, setActivityLogs] = useState<LogEntry[]>([
    { time: '11:10:32', type: 'SYS', message: 'BUJJI AI Assistant online.' },
    { time: '11:10:34', type: 'LOG', message: 'System check completed.' },
    { time: '11:10:37', type: 'INFO', message: 'Loaded model: BUJJI-v1.0' },
    { time: '11:10:42', type: 'SYS', message: 'Connecting to knowledge base...' },
    { time: '11:10:46', type: 'INFO', message: 'Knowledge base connected.' },
    { time: '11:10:52', type: 'USER', message: 'Initializing session layout...' },
    { time: '11:10:58', type: 'SYS', message: 'UI ready. Waiting for input...' },
    { time: '11:11:56', type: 'INFO', message: 'Microphone muted.' },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    setActivityLogs((prev) => [...prev.slice(-30), { time, type, message }]);
  };

  // Text-To-Speech hook
  const { speak, isSpeaking, cancel: cancelSpeech } = useSpeechSynthesis({
    enabled: autoSpeak,
    rate: 1.0,
    pitch: 0.95,
  });

  // Speech Recognition hook
  const {
    isListening,
    transcript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition({
    onResult: (text) => {
      setInputText(text);
    },
  });

  // Update input as voice is speaking
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Track mic status changes in activity log
  useEffect(() => {
    if (isListening) {
      addLog('SYS', 'Audio input active. Listening...');
    } else {
      addLog('INFO', 'Microphone muted.');
    }
  }, [isListening]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-scroll activity log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLogs]);

  const loadConversations = async () => {
    try {
      const data = await assistantService.getConversations();
      setConversations(data);
      if (data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await assistantService.getMessages(convId);
      setMessages(msgs);
      if (msgs.length > 0) {
        setActiveCenterTab('chat');
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleNewConversation = async () => {
    try {
      cancelSpeech();
      const newConv = await assistantService.createConversation('New Session');
      setConversations([newConv, ...conversations]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
      setActiveCenterTab('chat');
      addLog('SYS', 'Created new operational session.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start new session');
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!window.confirm('Delete this conversation history, sir?')) return;
    try {
      await assistantService.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (currentConversationId === convId) {
        setCurrentConversationId(remaining.length > 0 ? remaining[0].id : undefined);
      }
      addLog('LOG', 'Archived conversation deleted.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete conversation');
    }
  };

  const handleSendCommand = async (textToSend?: string) => {
    const rawMessage = textToSend || inputText;
    const message = rawMessage.trim();
    if (!message || loading) return;

    setInputText('');
    setErrorMsg(null);
    setLoading(true);
    cancelSpeech();
    setActiveCenterTab('chat');
    addLog('USER', `Instruction: "${message.slice(0, 40)}${message.length > 40 ? '...' : ''}"`);

    // Optimistic user message insertion
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversationId || 'pending',
      user_id: user?.id || 'user',
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await assistantService.sendCommand(message, currentConversationId);

      if (response.conversation_id && response.conversation_id !== currentConversationId) {
        setCurrentConversationId(response.conversation_id);
        loadConversations();
      }

      const assistantMsg: Message = {
        id: response.message_id || `asst-${Date.now()}`,
        conversation_id: response.conversation_id || currentConversationId || '',
        user_id: user?.id || 'user',
        role: 'assistant',
        content: response.message,
        action: response.action,
        metadata: response.data,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      addLog('AI', 'Response executed.');

      if (response.action && response.action !== 'none') {
        executeClientAction(response.action, response.data);
        addLog('SYS', `Action invoked: ${response.action}`);
      }

      if (autoSpeak && response.message) {
        speak(response.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'BUJJI could not process that command.');
      addLog('LOG', 'Error: Command execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  };

  const handleInterrupt = () => {
    cancelSpeech();
    if (isListening) stopListening();
    setLoading(false);
    addLog('SYS', 'Session interrupted [ESC].');
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setUploadedFile({ name: file.name, size: sizeFormatted });
      addLog('FILE', `Attached: ${file.name} (${sizeFormatted})`);
      setInputText((prev) => (prev ? `${prev} [Attached: ${file.name}]` : `Please analyze attached file: ${file.name}`));
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setUploadedFile({ name: file.name, size: sizeFormatted });
      addLog('FILE', `Dropped: ${file.name} (${sizeFormatted})`);
      setInputText((prev) => (prev ? `${prev} [Attached: ${file.name}]` : `Please inspect attached file: ${file.name}`));
    }
  };

  // State calculation for Nucleus and badges
  const systemStatus = isListening
    ? 'listening'
    : isSpeaking
    ? 'speaking'
    : loading
    ? 'processing'
    : 'online';

  return (
    <div className="flex h-screen bg-[#03070b] text-slate-100 overflow-hidden font-sans select-none">
      {/* LEFT COLUMN: Sidebar (Navigation, System Status, AI Core, Tagline) */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          setCurrentConversationId(id);
          setActiveCenterTab('chat');
        }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* CENTER & RIGHT COLUMNS */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TOP BAR: Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          status={systemStatus}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
          onTriggerBriefing={() => handleSendCommand('Give me the morning briefing')}
        />

        {/* MAIN BODY: 2-Part Grid (Center AI & News + Right Activity & Commands) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 overflow-y-auto">
          {/* ========================================================= */}
          {/* CENTER AREA (Col 7 / 8) : // AI CORE with NUCLEUS + NEWS  */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 flex flex-col gap-3.5 h-full">
            {/* TOP CARD: AI CORE & THE NUCLEUS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#060a0f] border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[410px]">
              {/* Card Header: // AI CORE + v1.0 badge */}
              <div className="flex items-start justify-between z-10 font-mono">
                <div>
                  <div className="text-[11px] text-slate-400 tracking-wider font-semibold">
                    // AI CORE
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wider mt-0.5">
                    BUJJI
                  </h2>
                  <div className="text-[10px] text-slate-400 tracking-widest uppercase">
                    INTELLIGENT ASSISTANT
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300 font-semibold">
                  v1.0
                </div>
              </div>

              {/* LIVING NUCLEUS VISUALIZATION */}
              <NucleusCore status={systemStatus} isMuted={!isListening} />
            </div>

            {/* BOTTOM CARD: LATEST NEWS or ACTIVE SESSION MESSAGES */}
            <div className="flex-1 p-4 rounded-2xl bg-[#060a0f] border border-white/10 flex flex-col min-h-[260px]">
              {/* Sub-header with toggle between News and Chat Feed */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-white tracking-wider uppercase">LATEST NEWS</span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Top World News Today</span>
                  {messages.length > 0 && (
                    <button
                      onClick={() => setActiveCenterTab(activeCenterTab === 'chat' ? 'news' : 'chat')}
                      className={`ml-2 px-2.5 py-0.5 rounded text-[11px] border transition-all ${
                        activeCenterTab === 'chat'
                          ? 'bg-white/10 border-white/25 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {activeCenterTab === 'chat' ? 'VIEW NEWS' : `VIEW CHAT (${messages.length})`}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>11:10:31</span>
                  {!newsDismissed && (
                    <button
                      onClick={() => setNewsDismissed(true)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                      <span>DISMISS</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="flex-1 overflow-y-auto pt-3">
                {errorMsg && (
                  <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {speechError && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono">
                    {speechError}
                  </div>
                )}

                {/* News View */}
                {activeCenterTab === 'news' && !newsDismissed && (
                  <div className="space-y-3 font-mono">
                    {/* Item 1 */}
                    <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-white">World News</span>
                          <span className="text-slate-400">[nytimes.com]</span>
                          <span className="text-slate-400 ml-auto text-[11px]">2h ago</span>
                        </div>
                        <div className="text-xs text-slate-200 font-medium">
                          Israel and Hamas reach new ceasefire talks, mediators say
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          Qatar and Egypt are leading a new round of ceasefire negotiations between Israel and Hamas, ...
                        </div>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-white">Business</span>
                          <span className="text-slate-400">[reuters.com]</span>
                          <span className="text-slate-400 ml-auto text-[11px]">3h ago</span>
                        </div>
                        <div className="text-xs text-slate-200 font-medium">
                          Global markets rally as tech stocks gain momentum
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          Investors are optimistic about upcoming earnings and easing inflation data, ...
                        </div>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-white">Technology</span>
                          <span className="text-slate-400">[bbc.com]</span>
                          <span className="text-slate-400 ml-auto text-[11px]">4h ago</span>
                        </div>
                        <div className="text-xs text-slate-200 font-medium">
                          New AI model shows major leap in reasoning capabilities
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          Researchers say the latest model can solve complex problems with higher accuracy, ...
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Feed View */}
                {(activeCenterTab === 'chat' || newsDismissed) && (
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-mono">
                        No active conversation messages yet. Issue a command below to begin.
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} onSpeak={(text) => speak(text)} />
                      ))
                    )}
                    {loading && (
                      <div className="flex items-center gap-2.5 py-2 text-xs font-mono text-slate-400">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                        <span>BUJJI IS PROCESSING INSTRUCTION...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN (Col 4) : ACTIVITY LOG + FILE UPLOAD + COMMAND INPUT         */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 h-full">
            {/* 1. ACTIVITY LOG */}
            <div className="p-4 rounded-2xl bg-[#060a0f] border border-white/10 flex flex-col h-[280px]">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 font-mono text-xs">
                <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span>ACTIVITY LOG</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#081e18] border border-emerald-500/30 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>

              {/* Terminal stream */}
              <div className="flex-1 overflow-y-auto pt-2.5 space-y-1.5 font-mono text-[11px] leading-relaxed">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 shrink-0">{log.time}</span>
                    <span
                      className={`font-semibold shrink-0 w-11 ${
                        log.type === 'SYS'
                          ? 'text-teal-200/80'
                          : log.type === 'INFO'
                          ? 'text-emerald-300/70'
                          : log.type === 'USER'
                          ? 'text-slate-200'
                          : log.type === 'AI'
                          ? 'text-sky-200/70'
                          : log.type === 'FILE'
                          ? 'text-[#d9a38f]'
                          : 'text-slate-500'
                      }`}
                    >
                      {log.type} :
                    </span>
                    <span className="text-slate-300 break-words">{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* 2. FILE UPLOAD */}
            <div className="p-4 rounded-2xl bg-[#060a0f] border border-white/10 flex flex-col font-mono text-xs">
              <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase pb-2.5 border-b border-white/10">
                <UploadCloud className="w-4 h-4 text-slate-400" />
                <span>FILE UPLOAD</span>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 p-5 rounded-xl border border-dashed border-white/15 hover:border-white/30 bg-[#03070b]/60 hover:bg-[#03070b] flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                  {uploadedFile ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Upload className="w-5 h-5" />}
                </div>

                {uploadedFile ? (
                  <div>
                    <div className="text-xs font-semibold text-emerald-400 truncate max-w-[200px]">
                      {uploadedFile.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{uploadedFile.size} • Attached</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Drop file here or click to browse
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Images • PDFs • Docs • Code • Audio • Video
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. COMMAND INPUT & CONTROLS */}
            <div className="p-4 rounded-2xl bg-[#060a0f] border border-white/10 flex flex-col font-mono space-y-3">
              <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase pb-2.5 border-b border-white/10 text-xs">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span>COMMAND INPUT</span>
              </div>

              {/* Text Input area */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? 'Listening to speech...'
                      : 'Type a command or question...'
                  }
                  className="w-full py-2.5 pl-3.5 pr-10 rounded-xl bg-[#03070b] border border-white/10 focus:border-white/25 text-slate-100 placeholder-slate-500 text-xs focus:outline-none resize-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => handleSendCommand()}
                  disabled={!inputText.trim() || loading}
                  className="absolute right-2 bottom-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-30 disabled:hover:bg-white/10"
                  title="Send Instruction"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Control Buttons matching design reference */}
              <div className="space-y-2">
                {/* INTERRUPT [ESC] Button */}
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#1a0b0b] hover:bg-[#241010] border border-[#c9706b]/50 text-[#e0908a] text-xs font-semibold tracking-wider transition-colors"
                  title="Interrupt current output [ESC]"
                >
                  <Square className="w-3 h-3 fill-[#c9706b] text-[#c9706b]" />
                  <span>INTERRUPT</span>
                  <span className="text-[10px] text-[#c9706b]/70 font-normal">[ESC]</span>
                </button>

                {/* MICROPHONE TOGGLE Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!isSpeechSupported}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wider transition-colors border disabled:opacity-40 ${
                    isListening
                      ? 'bg-teal-400/10 border-teal-200/40 text-teal-100'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-slate-400'
                  }`}
                  title={
                    !isSpeechSupported
                      ? 'Speech recognition not supported in this browser'
                      : isListening
                      ? 'Click to mute microphone'
                      : 'Click to activate microphone'
                  }
                >
                  {isListening ? <Mic className="w-3.5 h-3.5 text-teal-200" /> : <MicOff className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isListening ? 'MICROPHONE ACTIVE' : 'MICROPHONE MUTED'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
