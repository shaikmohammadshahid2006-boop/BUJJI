import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Terminal,
  Sparkles,
  Monitor,
  Send,
  Zap,
} from 'lucide-react';
import { NucleusCore } from './NucleusCore';
import { apiClient } from '../services/api';

interface VoiceHudModalProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onSendMessage: (text: string) => void;
  lastAssistantMessage?: string;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

export const VoiceHudModal: React.FC<VoiceHudModalProps> = ({
  isOpen,
  onClose,
  isListening,
  isSpeaking,
  transcript,
  onStartListening,
  onStopListening,
  onSendMessage,
  lastAssistantMessage,
  autoSpeak,
  onToggleAutoSpeak,
}) => {
  const [hudInput, setHudInput] = useState('');
  const [localDesktopStatus, setLocalDesktopStatus] = useState<string>('idle');
  const [desktopMessage, setDesktopMessage] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Auto start listening on open if supported
      onStartListening();
    }
  }, [isOpen]);

  const handleLaunchLocalDesktop = async () => {
    setLocalDesktopStatus('launching');
    setDesktopMessage('Connecting to local desktop daemon (py main.py)...');
    try {
      const res = await apiClient<any>('/api/system/launch-desktop', {
        method: 'POST',
        requiresAuth: false,
      });
      if (res?.success) {
        setLocalDesktopStatus('online');
        setDesktopMessage(res.message || 'Desktop HUD (main.py) launched successfully!');
      } else {
        setLocalDesktopStatus('cloud_mode');
        setDesktopMessage(
          res?.message ||
            'You are connected to the live Cloud version! To launch the native PyQt6 window, run "py main.py" in your local terminal.'
        );
      }
    } catch {
      setLocalDesktopStatus('cloud_mode');
      setDesktopMessage(
        'Live Cloud Site Active: Native desktop OS windows run via "py main.py" locally. You can use the full Voice & Conversational Intelligence right here in your browser!'
      );
    }
  };

  const handleSendHudInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hudInput.trim()) return;
    onSendMessage(hudInput.trim());
    setHudInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  if (!isOpen) return null;

  const currentStatus: 'online' | 'listening' | 'speaking' | 'processing' = isListening
    ? 'listening'
    : isSpeaking
    ? 'speaking'
    : 'online';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020508]/90 backdrop-blur-xl overflow-hidden select-none animate-fadeIn">
      {/* Background Holographic Grid / Scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(245,158,11,0.08),rgba(0,0,0,0))]" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main HUD Window Container */}
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[860px] mx-4 rounded-3xl bg-[#03070b]/95 border border-white/15 shadow-[0_0_80px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden">
        {/* Top Arc & HUD Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-widest font-mono">
                  BUJJI MARK LV
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  LIVE VOICE HUD
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 tracking-wider">
                Voice & Conversational Intelligence Engine
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleAutoSpeak}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={autoSpeak ? 'Audio Response Active' : 'Audio Muted'}
            >
              {autoSpeak ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">VOICE ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">MUTED</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all"
              title="Close HUD [ESC]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HUD Body Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-hidden">
          {/* Left Column: Center Arc Reactor Core & Voice Pulse */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 rounded-2xl bg-[#060a0f] border border-white/10 relative overflow-hidden">
            {/* Holographic HUD Ring Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-80 h-80 rounded-full border border-dashed border-amber-400/40 animate-spin-slow" />
              <div className="absolute w-96 h-96 rounded-full border border-white/10" />
              <div className="absolute w-[450px] h-[450px] rounded-full border border-dashed border-cyan-400/20 animate-spin-reverse" />
            </div>

            {/* Core Header Status */}
            <div className="w-full flex items-center justify-between z-10 font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-bold tracking-wider">
                  {isListening
                    ? 'MICROPHONE ACTIVE // LISTENING'
                    : isSpeaking
                    ? 'SYNTHESIZING AUDIO // VOCAL'
                    : 'INTELLIGENCE READY // STANDBY'}
                </span>
              </div>
              <span className="tracking-widest text-[11px] text-amber-400">MARK-LV // REAC-01</span>
            </div>

            {/* Center Reactor / Nucleus Core */}
            <div className="relative my-auto flex flex-col items-center justify-center z-10 py-4">
              <div className="relative flex items-center justify-center">
                {/* Glow aura */}
                <div
                  className={`absolute -inset-10 rounded-full filter blur-2xl transition-all duration-700 pointer-events-none ${
                    isListening
                      ? 'bg-emerald-500/30'
                      : isSpeaking
                      ? 'bg-amber-500/35'
                      : 'bg-cyan-500/20'
                  }`}
                />
                <NucleusCore status={currentStatus} isMuted={!autoSpeak} />
              </div>

              {/* Dynamic Soundwave Equalizer */}
              <div className="flex items-center gap-1 mt-6 h-8">
                {Array.from({ length: 24 }).map((_, i) => {
                  const delay = (i * 0.05).toFixed(2);
                  const isMid = i >= 8 && i <= 16;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isListening
                          ? 'bg-gradient-to-t from-emerald-500 to-cyan-300'
                          : isSpeaking
                          ? 'bg-gradient-to-t from-amber-500 to-amber-200'
                          : 'bg-white/10'
                      }`}
                      style={{
                        height:
                          isListening || isSpeaking
                            ? `${25 + ((i * 19) % 75)}%`
                            : isMid
                            ? '20%'
                            : '10%',
                        animation:
                          isListening || isSpeaking
                            ? `pulseGlow 0.6s infinite ease-in-out ${delay}s alternate`
                            : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Push to talk / Voice Interaction Bar */}
            <div className="w-full z-10 flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  if (isListening) onStopListening();
                  else onStartListening();
                }}
                className={`w-full py-4 px-6 rounded-2xl font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
                  isListening
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-500/30 border border-red-400 animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] border border-amber-300'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>LISTENING... TAP TO FINISH SPEAKING</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-black" />
                    <span>TAP TO SPEAK WITH BUJJI (VOICE MODE)</span>
                  </>
                )}
              </button>

              <div className="text-[11px] font-mono text-slate-400 tracking-wide text-center">
                Speak directly into your microphone, or tap quick commands below.
              </div>
            </div>
          </div>

          {/* Right Column: Live Transcription, AI Dialogue & Desktop Launcher */}
          <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
            {/* Dialogue & Response Box */}
            <div className="flex-1 p-5 rounded-2xl bg-[#060a0f] border border-white/10 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-slate-200">REAL-TIME CONVERSATION</span>
                </div>
                <span className="text-[10px] text-emerald-400">CONNECTED</span>
              </div>

              {/* Scrollable Message Box */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 font-mono text-xs">
                {/* User Voice Input Bubble */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center justify-between">
                    <span>YOU (VOICE IN)</span>
                    {isListening && <span className="text-emerald-400 animate-pulse">● LIVE AUDIO</span>}
                  </div>
                  <div className="text-slate-100 text-sm">
                    {transcript || (
                      <span className="text-slate-400 italic">
                        {isListening ? 'Speak now, BUJJI is listening...' : 'No voice detected yet.'}
                      </span>
                    )}
                  </div>
                </div>

                {/* BUJJI Vocal Response Bubble */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-1 flex items-center justify-between">
                    <span>BUJJI (AI RESPONSE)</span>
                    {isSpeaking && <span className="text-amber-300 animate-pulse">● SPEAKING</span>}
                  </div>
                  <div className="text-slate-100 text-sm leading-relaxed">
                    {lastAssistantMessage || (
                      <span className="text-slate-400 italic">
                        "Good day, sir. Voice & Conversational Intelligence is active. How may I assist you?"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual Input Fallback */}
              <form onSubmit={handleSendHudInput} className="mt-3 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={hudInput}
                  onChange={(e) => setHudInput(e.target.value)}
                  placeholder="Or type an instruction here..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={!hudInput.trim()}
                  className="p-2.5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Quick Voice Commands Pills */}
            <div className="p-4 rounded-2xl bg-[#060a0f] border border-white/10 flex flex-col gap-2 font-mono">
              <span className="text-[10px] text-slate-400 tracking-wider font-bold uppercase">
                QUICK VOICE COMMANDS:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleQuickPrompt('Give me the morning briefing')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-amber-400/10 hover:border-amber-400/30 border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors text-[11px]"
                >
                  ⚡ Morning Briefing
                </button>
                <button
                  onClick={() => handleQuickPrompt('Run complete system diagnostics')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-amber-400/10 hover:border-amber-400/30 border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors text-[11px]"
                >
                  🛡️ System Diagnostic
                </button>
                <button
                  onClick={() => handleQuickPrompt('What is the current time and system status?')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-amber-400/10 hover:border-amber-400/30 border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors text-[11px]"
                >
                  ⏰ Time & Telemetry
                </button>
                <button
                  onClick={() => handleQuickPrompt('Open YouTube and play relaxing music')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-amber-400/10 hover:border-amber-400/30 border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors text-[11px]"
                >
                  📺 Open YouTube
                </button>
              </div>
            </div>

            {/* Native Desktop Assistant (py main.py) Status Banner */}
            <div className="p-4 rounded-2xl bg-[#08121a] border border-cyan-500/20 flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200">DESKTOP APP (py main.py)</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    localDesktopStatus === 'online'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : localDesktopStatus === 'cloud_mode'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {localDesktopStatus === 'online'
                    ? 'DESKTOP RUNNING'
                    : localDesktopStatus === 'cloud_mode'
                    ? 'CLOUD LIVE MODE'
                    : 'READY'}
                </span>
              </div>

              {desktopMessage ? (
                <div className="text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg leading-relaxed">
                  {desktopMessage}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  You are currently experiencing the full BUJJI Voice & AI Assistant directly on the live website!
                </div>
              )}

              <button
                onClick={handleLaunchLocalDesktop}
                disabled={localDesktopStatus === 'launching'}
                className="w-full mt-1 py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {localDesktopStatus === 'launching'
                    ? 'CONNECTING...'
                    : 'TRIGGER LOCAL DESKTOP (py main.py)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
