import React from 'react';

interface StatusBadgeProps {
  status: 'online' | 'listening' | 'speaking' | 'processing';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs = {
    online: {
      color: 'bg-emerald-500',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      label: 'SYSTEM ONLINE',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    },
    listening: {
      color: 'bg-cyan-400 animate-ping',
      border: 'border-cyan-400/40',
      text: 'text-cyan-300',
      label: 'AUDIO INPUT ACTIVE',
      glow: 'shadow-[0_0_12px_rgba(0,229,255,0.8)]',
    },
    speaking: {
      color: 'bg-blue-400 animate-pulse',
      border: 'border-blue-400/40',
      text: 'text-blue-300',
      label: 'VOCAL SYNTHESIS',
      glow: 'shadow-[0_0_12px_rgba(59,130,246,0.8)]',
    },
    processing: {
      color: 'bg-amber-400 animate-spin',
      border: 'border-amber-400/30',
      text: 'text-amber-300',
      label: 'NEURAL PROCESSING',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    },
  };

  const current = configs[status] || configs.online;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jarvis-dark/80 border ${current.border} text-xs font-mono tracking-wider backdrop-blur-md`}>
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${current.color} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.color} ${current.glow}`} />
      </span>
      <span className={current.text}>{current.label}</span>
    </div>
  );
};
