import React, { useEffect, useState } from 'react';
import { Menu, Cpu, Monitor, Volume2, VolumeX, Loader2, Minus, Square, X, Download, Terminal } from 'lucide-react';
import { apiClient } from '../services/api';

interface NavbarProps {
  onToggleSidebar: () => void;
  status: 'online' | 'listening' | 'speaking' | 'processing';
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onTriggerBriefing?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  status,
  autoSpeak,
  onToggleAutoSpeak,
  onTriggerBriefing: _onTriggerBriefing,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isDesktopRunning, setIsDesktopRunning] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll desktop main.py status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const desktopRes = await apiClient<any>('/api/system/desktop-status', { requiresAuth: false }).catch(() => null);
        if (desktopRes && typeof desktopRes.running === 'boolean') {
          setIsDesktopRunning(desktopRes.running);
        }
      } catch {
        // quiet fallback
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchDesktop = async () => {
    setIsLaunching(true);

    // 1. Trigger Windows Custom Protocol Handler (bujji://launch)
    // Windows immediately launches: py main.py desktop
    try {
      window.location.href = 'bujji://launch';
    } catch {
      // quiet fallback
    }

    // 2. Direct local machine bridge (triggers local py main.py web when running)
    if (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        await fetch('http://127.0.0.1:8000/api/system/launch-desktop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        setIsDesktopRunning(true);
      } catch {
        // quiet fallback
      }
    }

    // 3. Remote cloud API endpoint bridge
    try {
      const res = await apiClient<any>('/api/system/launch-desktop', {
        method: 'POST',
        requiresAuth: false,
      });
      if (res?.running) {
        setIsDesktopRunning(true);
      }
    } catch (err: any) {
      console.warn('Backend desktop launch response:', err);
    } finally {
      setTimeout(() => setIsLaunching(false), 1200);
    }

    // Show setup modal so new users or users on another PC can download setup-bujji-launcher.bat
    if (!isDesktopRunning) {
      setTimeout(() => {
        setShowSetupModal(true);
      }, 500);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="h-16 px-4 md:px-6 bg-[#03070b] border-b border-white/10 flex items-center justify-between z-30 select-none">
      {/* Left: BUJJI AI ASSISTANT */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/10"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-slate-200">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white tracking-wider font-mono">
              BUJJI
            </span>
            <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
              AI ASSISTANT
            </span>
          </div>
        </div>
      </div>

      {/* Center: THINK / ANALYZE / ASSIST */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
        <div className="w-12 h-[1px] bg-white/10" />
        <span className="tracking-widest">
          THINK <span className="text-slate-600">/</span> ANALYZE <span className="text-slate-600">/</span> ASSIST
        </span>
        <div className="w-12 h-[1px] bg-white/10" />
      </div>

      {/* Right: SYSTEM ONLINE, Clock, Window Controls */}
      <div className="flex items-center gap-3 sm:gap-4 font-mono">
        {/* Desktop Agent Sync Pill with Blinking Arrow Indicator */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={handleLaunchDesktop}
            disabled={isLaunching}
            className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold tracking-wide border transition-all shadow-[0_0_14px_rgba(245,158,11,0.4)] hover:shadow-[0_0_22px_rgba(251,191,36,0.7)] ${
              isDesktopRunning
                ? 'bg-[#080d12] border-amber-400 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.6)]'
                : 'bg-[#03070b] hover:bg-[#0a0f16] border-amber-400/90 hover:border-amber-300 text-amber-300 hover:text-amber-200'
            }`}
            title={isDesktopRunning ? 'Voice & Conversational Intelligence HUD is active' : 'Launch Voice & Conversational Intelligence HUD'}
          >
            {isLaunching ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Monitor className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-mono text-amber-300">
              {isLaunching ? 'SYNCING...' : 'Voice & Conversational Intelligence'}
            </span>
          </button>

          {/* Glowing Animated Blinking Arrow + Click here text */}
          <div
            onClick={handleLaunchDesktop}
            className="flex items-center gap-1.5 cursor-pointer select-none group"
            title="Click to launch Voice & Conversational Intelligence"
          >
            {/* Blinking pointing arrow with radiating sparks */}
            <div className="relative flex items-center justify-center animate-pulse">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]"
              >
                {/* Radiating spark rays */}
                <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="4" x2="8.5" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="6" y1="20" x2="8.5" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                {/* Arrow pointing left */}
                <path
                  d="M19 12H5M5 12L11 6M5 12L11 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xs sm:text-[13px] font-bold text-amber-300 font-mono tracking-wide animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] group-hover:text-amber-200">
              Click here
            </span>
          </div>

          {/* Quick 1-Click Setup Download Link for other computers */}
          <a
            href="/setup-bujji-launcher.bat"
            download="setup-bujji-launcher.bat"
            className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-cyan-100 transition-all shadow-[0_0_8px_rgba(6,182,212,0.3)] hover:shadow-[0_0_14px_rgba(6,182,212,0.6)]"
            title="First time on this PC? Download 1-Click Setup"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>Setup (.bat)</span>
          </a>
        </div>

        {/* Audio Output Mute Toggle */}
        <button
          onClick={onToggleAutoSpeak}
          className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10 transition-colors"
          title={autoSpeak ? 'Audio responses active' : 'Audio responses muted'}
        >
          {autoSpeak ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Status Pill: SYSTEM ONLINE */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#081e18] border border-emerald-500/30 text-[11px] text-emerald-400 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="font-semibold uppercase tracking-wider">
            {status === 'listening' ? 'LISTENING' : status === 'speaking' ? 'VOCAL' : status === 'processing' ? 'PROCESSING' : 'SYSTEM ONLINE'}
          </span>
        </div>

        {/* Live Digital Clock */}
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-white tracking-wider leading-none">
            {timeStr || '11:11:56'}
          </div>
          <div className="text-[10px] text-slate-500 tracking-wide mt-0.5 leading-none">
            {dateStr || 'Wed, 01 Oct 2026'}
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/10 text-slate-400">
          <button
            className="p-1 hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-1 hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Toggle Fullscreen"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BUJJI Desktop Launcher Sync Modal for other users */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#050a12] border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.25)] text-slate-200 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    BUJJI Desktop Agent Sync
                  </h3>
                  <p className="text-xs text-amber-400/80">Voice &amp; Conversational Intelligence HUD</p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Launch Status Badge */}
            <div className="my-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div className="text-xs">
                <span className="text-amber-300 font-semibold">Launch signal sent: </span>
                <span className="text-slate-300">Opening <code className="text-amber-200 bg-black/40 px-1 py-0.5 rounded">bujji://launch</code> on your PC...</span>
              </div>
            </div>

            {/* If on another PC card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Terminal className="w-4 h-4" />
                <span>Opening on another computer or first time?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                If the desktop app didn&apos;t appear on your screen, your computer needs the 1-Click setup once to allow this website to launch BUJJI:
              </p>

              {/* 3 Steps */}
              <div className="space-y-2 text-xs font-sans text-slate-300 pl-1">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">1</span>
                  <span>Click below to download <strong>setup-bujji-launcher.bat</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">2</span>
                  <span>Double-click the downloaded file (it auto-sets up BUJJI &amp; Python in seconds).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">3</span>
                  <span>Click <strong>&quot;Launch Desktop Now&quot;</strong> anytime from this site!</span>
                </div>
              </div>

              {/* Big Download Button */}
              <div className="pt-2">
                <a
                  href="/setup-bujji-launcher.bat"
                  download="setup-bujji-launcher.bat"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_26px_rgba(6,182,212,0.6)]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download 1-Click Setup (setup-bujji-launcher.bat)</span>
                </a>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
              <button
                onClick={() => {
                  try { window.location.href = 'bujji://launch'; } catch {}
                }}
                className="py-2 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-2 transition-colors"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Launch Desktop Now</span>
              </button>

              <button
                onClick={() => setShowSetupModal(false)}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
