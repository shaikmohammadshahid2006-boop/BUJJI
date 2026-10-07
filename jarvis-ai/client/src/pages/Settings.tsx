import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { assistantService } from '../services/assistantService';
import {
  ArrowLeft,
  User,
  Volume2,
  Trash2,
  LogOut,
  Check,
  Monitor,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, signOut, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [voiceEnabled, setVoiceEnabled] = useState(user?.voice_enabled ?? true);
  const [autoSpeak, setAutoSpeak] = useState(user?.auto_speak ?? true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      display_name: displayName,
      voice_enabled: voiceEnabled,
      auto_speak: autoSpeak,
    });
    setStatusMsg('Settings successfully updated, sir.');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to purge all conversation history? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const convs = await assistantService.getConversations();
      for (const c of convs) {
        await assistantService.deleteConversation(c.id);
      }
      setStatusMsg('All conversation archives purged.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert(`Error clearing history: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const testVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('BUJJI vocal systems operational at designated parameters.');
      u.rate = speechRate;
      u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="min-h-screen bg-[#03070b] text-slate-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header back button */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO DASHBOARD</span>
          </Link>
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">// SYSTEM CONFIGURATION</div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#060a0f] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 font-mono font-semibold text-xs text-white uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>OPERATOR PROFILE</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Display Callsign
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#03070b] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Operator Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-lg bg-[#03070b]/60 border border-white/5 text-slate-500 text-xs font-mono cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-mono font-medium tracking-wider transition-colors"
            >
              SAVE CHANGES
            </button>
          </form>
        </div>

        {/* Voice Preferences Card */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#060a0f] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 font-mono font-semibold text-xs text-white uppercase tracking-wider">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>VOCAL INTERFACE PROTOCOLS</span>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            <label className="flex items-center justify-between p-3 rounded-lg bg-[#03070b] border border-white/10 cursor-pointer">
              <span className="text-slate-300">Speech Recognition Microphone Input</span>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-white bg-black border-white/20 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-[#03070b] border border-white/10 cursor-pointer">
              <span className="text-slate-300">Auto-Speak BUJJI Vocal Responses</span>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-4 h-4 rounded text-white bg-black border-white/20 focus:ring-0"
              />
            </label>

            <div>
              <div className="flex justify-between text-slate-400 mb-1.5">
                <span>Vocal Cadence Rate ({speechRate}x)</span>
                <button
                  type="button"
                  onClick={testVoice}
                  className="text-slate-300 hover:text-white underline underline-offset-2"
                >
                  Test Audio Synthesis
                </button>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-white"
              />
            </div>
          </div>
        </div>

        {/* Security & Architecture Info */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#060a0f] border border-white/10 space-y-2.5">
          <div className="flex items-center gap-2 font-mono font-semibold text-xs text-white uppercase tracking-wider">
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            <span>DESKTOP VS WEB ARCHITECTURE</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            In accordance with system security protocols, browser operations (intelligence, knowledge base, code synthesis) run sandboxed. Host operations (local application execution, volume adjustments, and system controls) are coordinated via the BUJJI desktop client.
          </p>
        </div>

        {/* Danger Zone Card */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#060a0f] border border-red-500/20 space-y-4">
          <div className="flex items-center gap-2 font-mono font-semibold text-xs text-red-400 uppercase tracking-wider">
            <Trash2 className="w-3.5 h-3.5" />
            <span>DATA PURGE & DE-AUTHORIZATION</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isClearing ? 'PURGING ARCHIVES...' : 'DELETE ALL CHAT HISTORY'}</span>
            </button>

            <button
              onClick={() => signOut()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOGOUT SESSION</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
