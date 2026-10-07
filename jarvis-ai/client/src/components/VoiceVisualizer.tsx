import React from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  type?: 'listening' | 'speaking';
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive, type = 'listening' }) => {
  if (!isActive) return null;

  const barCount = 18;
  const isListening = type === 'listening';

  return (
    <div className="flex items-center justify-center gap-1.5 py-3 px-6 rounded-2xl bg-jarvis-navy/70 border border-jarvis-glow/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,229,255,0.2)]">
      <div className="text-xs font-mono mr-2 text-cyan-400 uppercase tracking-widest animate-pulse">
        {isListening ? 'VOICE IN' : 'BUJJI OUT'}
      </div>
      <div className="flex items-center gap-1 h-8">
        {Array.from({ length: barCount }).map((_, i) => {
          // calculate staggered animation delay and random height
          const delay = (i * 0.08).toFixed(2);
          const duration = (0.5 + (i % 4) * 0.2).toFixed(2);
          return (
            <div
              key={i}
              className={`w-1 rounded-full ${
                isListening
                  ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
                  : 'bg-gradient-to-t from-blue-600 to-cyan-300'
              }`}
              style={{
                height: `${25 + ((i * 17) % 75)}%`,
                animation: `pulseGlow ${duration}s infinite ease-in-out ${delay}s alternate`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
