import React, { useState, useEffect } from 'react';
import {
  Home,
  Clock,
  Settings as SettingsIcon,
  Cpu,
  Layers,
  Wifi,
  HardDrive,
  Thermometer,
  Plus,
  Trash2,
  X,
  LogOut,
} from 'lucide-react';
import { Conversation } from '../types/conversation';
import { useAuth } from '../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  activeNavTab?: string;
  onNavTabChange?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  activeNavTab = 'dashboard',
  onNavTabChange,
}) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'news' | 'logs' | 'settings'>(
    (activeNavTab as any) || 'dashboard'
  );

  useEffect(() => {
    if (activeNavTab) {
      setActiveTab(activeNavTab as any);
    }
  }, [activeNavTab]);

  const [metrics, setMetrics] = useState<{
    cpu_percent: number;
    ram_percent: number;
    uptime?: string;
    gpu_percent?: number | null;
  } | null>(null);
  const [sessionUptime, setSessionUptime] = useState<string>('355:59');

  // Fetch hardware metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiClient<any>('/api/system/metrics', { requiresAuth: false }).catch(() => null);
        if (res?.metrics) {
          setMetrics(res.metrics);
          if (res.metrics.uptime) {
            setSessionUptime(res.metrics.uptime);
          }
        }
      } catch {
        // fallback to default
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTabClick = (tabKey: 'dashboard' | 'monitor' | 'news' | 'logs' | 'settings') => {
    setActiveTab(tabKey);
    if (onNavTabChange) onNavTabChange(tabKey);
  };

  const cpuVal = metrics?.cpu_percent ?? 9;
  const ramVal = metrics?.ram_percent ?? 86;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col justify-between bg-[#03070b] border-r border-white/10 p-3.5 select-none transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4">
          {/* Mobile close button */}
          <div className="md:hidden flex justify-end pb-2">
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="space-y-1 font-mono text-xs">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#0b1420] border border-cyan-500/30 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Home className="w-4 h-4 text-cyan-400" />
              <span className="font-medium tracking-wide">Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick('logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                activeTab === 'logs'
                  ? 'bg-[#0b1420] border border-cyan-500/30 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-medium tracking-wide">Logs</span>
            </button>

            <Link
              to="/settings"
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                location.pathname === '/settings'
                  ? 'bg-[#0b1420] border border-cyan-500/30 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              <span className="font-medium tracking-wide">Settings</span>
            </Link>
          </nav>

          {/* Conditional: If Logs tab is open, show session archive */}
          {activeTab === 'logs' ? (
            <div className="p-3 rounded-xl bg-[#060a0f] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase">SESSIONS</span>
                <button
                  onClick={onNewConversation}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-cyan-400"
                  title="New Session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono cursor-pointer ${
                      c.id === currentConversationId ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{c.title || 'Untitled Session'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(c.id);
                      }}
                      className="p-1 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* SYSTEM STATUS Card */}
              <div className="p-3.5 rounded-xl bg-[#060a0f] border border-white/10 space-y-3 font-mono">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  SYSTEM STATUS
                </div>

                {/* CPU */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span>CPU</span>
                    </div>
                    <span>{cpuVal}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-slate-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, cpuVal))}%` }}
                    />
                  </div>
                </div>

                {/* MEMORY */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>MEMORY</span>
                    </div>
                    <span>{ramVal}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-slate-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(10, ramVal))}%` }}
                    />
                  </div>
                </div>

                {/* NETWORK */}
                <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-slate-400" />
                    <span>NETWORK</span>
                  </div>
                  <span className="text-slate-300">10KB/s</span>
                </div>

                {/* GPU */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>GPU</span>
                  </div>
                  <span className="text-slate-300">0%</span>
                </div>

                {/* TEMP */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                    <span>TEMP</span>
                  </div>
                  <span className="text-slate-400">N/A</span>
                </div>
              </div>

              {/* AI CORE Card */}
              <div className="p-3.5 rounded-xl bg-[#060a0f] border border-white/10 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-white/5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold tracking-wider">AI CORE</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="tracking-wider">ACTIVE</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model</span>
                  <span className="text-emerald-400 font-semibold">BUJJI-v1.0</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mode</span>
                  <span className="text-slate-200">Online</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-emerald-400">{sessionUptime}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="text-slate-200">Ready</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Tagline & User Profile */}
        <div className="pt-4 border-t border-white/5 space-y-3 font-mono">
          <div className="text-[11px] text-slate-400 italic leading-snug">
            "Better Answers.<br />A Smarter Tomorrow."
          </div>

          {user && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 truncate max-w-[140px]">
                {user.display_name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={() => signOut()}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
