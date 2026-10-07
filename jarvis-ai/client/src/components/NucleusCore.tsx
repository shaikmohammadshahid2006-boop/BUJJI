import React, { useEffect, useRef } from 'react';
import { Cpu, Zap, Database, MessageSquare } from 'lucide-react';

interface NucleusCoreProps {
  status: 'online' | 'listening' | 'speaking' | 'processing';
  isMuted?: boolean;
}

interface Spark {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

/**
 * NucleusCore — visual-only AI core.
 * Base layer: the supplied Nucleus image (public/nucleus.jpg), slowly rotating.
 * Overlay: a lightweight canvas of twinkling sparks + state-driven breathing.
 */
export const NucleusCore: React.FC<NucleusCoreProps> = ({ status, isMuted = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = canvas.width;
    const C = SIZE / 2;
    const R = SIZE * 0.36; // sphere radius inside canvas

    // Sparks distributed inside the sphere disc (denser near rim, like the reference)
    const sparks: Spark[] = Array.from({ length: 90 }, () => {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * 0.55 + Math.random() * 0.45;
      const dist = Math.min(0.98, d) * R;
      return {
        x: C + Math.cos(a) * dist,
        y: C + Math.sin(a) * dist,
        r: Math.random() < 0.15 ? 1.4 : 0.8,
        speed: 0.4 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let raf = 0;
    let t = 0;
    let rot = 0;
    let breath = 1;

    const render = () => {
      t += 0.016;
      const s = statusRef.current;

      // State-driven motion (all very subtle)
      let rotSpeed = 0.012; // deg per frame
      let targetBreath = 1 + Math.sin(t * 0.8) * 0.006;
      let glow = 0.0;
      if (s === 'listening') {
        rotSpeed = 0.02;
        targetBreath = 1 + Math.sin(t * 2.2) * 0.012;
        glow = 0.05;
      } else if (s === 'processing') {
        rotSpeed = 0.05;
        targetBreath = 1 + Math.sin(t * 3) * 0.008;
        glow = 0.04;
      } else if (s === 'speaking') {
        rotSpeed = 0.025;
        targetBreath = 1 + Math.abs(Math.sin(t * 4.5)) * 0.022;
        glow = 0.07;
      }
      rot = (rot + rotSpeed) % 360;
      breath += (targetBreath - breath) * 0.12;

      if (imgRef.current) {
        imgRef.current.style.transform = `rotate(${rot}deg) scale(${breath})`;
      }

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Soft inner light when active
      if (glow > 0) {
        const g = ctx.createRadialGradient(C, C, R * 0.2, C, C, R * 1.15);
        g.addColorStop(0, `rgba(255,255,255,${glow})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(C, C, R * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Twinkling sparks (rotate with the image)
      const ang = (rot * Math.PI) / 180;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      for (const p of sparks) {
        const tw = Math.sin(t * p.speed + p.phase);
        if (tw < 0.55) continue; // only some sparks visible at any time
        const a = (tw - 0.55) / 0.45;
        const dx = (p.x - C) * breath;
        const dy = (p.y - C) * breath;
        const x = C + dx * cos - dy * sin;
        const y = C + dx * sin + dy * cos;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`;
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 4;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Status text label & dot color
  let statusText = 'ONLINE';
  let dotColor = 'bg-emerald-300/80';
  if (isMuted) {
    statusText = 'MUTED';
    dotColor = 'bg-emerald-300/80';
  } else if (status === 'listening') {
    statusText = 'LISTENING';
    dotColor = 'bg-teal-200 animate-pulse';
  } else if (status === 'speaking') {
    statusText = 'SPEAKING';
    dotColor = 'bg-slate-100 animate-pulse';
  } else if (status === 'processing') {
    statusText = 'PROCESSING';
    dotColor = 'bg-[#c9706b] animate-pulse';
  }

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-2 select-none">
      {/* 4 Surrounding Capability Nodes */}
      <div className="relative w-full max-w-2xl flex items-center justify-center min-h-[350px]">
        {/* Node 1: Top-Left - UNDERSTAND */}
        <div className="absolute top-4 left-2 sm:left-4 z-20 flex items-center gap-3 bg-[#060a0f]/90 border border-white/10 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-lg">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-slate-200">
            <Cpu className="w-4 h-4 text-slate-200" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-semibold text-white tracking-wider flex items-center gap-1">
              <span>UNDERSTAND</span>
              <span className="text-[10px] text-slate-400">→</span>
            </div>
            <div className="text-[11px] text-slate-400">Context & Intent</div>
          </div>
          {/* Subtle pointer line toward nucleus */}
          <div className="hidden sm:block absolute -right-8 top-1/2 w-8 h-[1px] bg-gradient-to-r from-white/15 to-transparent pointer-events-none" />
        </div>

        {/* Node 2: Top-Right - PROCESS */}
        <div className="absolute top-4 right-2 sm:right-4 z-20 flex items-center gap-3 bg-[#060a0f]/90 border border-white/10 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-lg">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-slate-200">
            <Zap className="w-4 h-4 text-slate-200" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-semibold text-white tracking-wider">PROCESS</div>
            <div className="text-[11px] text-slate-400">Analyze • Think • Plan</div>
          </div>
          {/* Subtle pointer line toward nucleus */}
          <div className="hidden sm:block absolute -left-8 top-1/2 w-8 h-[1px] bg-gradient-to-l from-white/15 to-transparent pointer-events-none" />
        </div>

        {/* Node 3: Bottom-Left - ACCESS */}
        <div className="absolute bottom-6 left-2 sm:left-4 z-20 flex items-center gap-3 bg-[#060a0f]/90 border border-white/10 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-lg">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-slate-200">
            <Database className="w-4 h-4 text-slate-200" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-semibold text-white tracking-wider">ACCESS</div>
            <div className="text-[11px] text-slate-400">Knowledge & Tools</div>
          </div>
          {/* Subtle pointer line toward nucleus */}
          <div className="hidden sm:block absolute -right-8 top-1/2 w-8 h-[1px] bg-gradient-to-r from-white/15 to-transparent pointer-events-none" />
        </div>

        {/* Node 4: Bottom-Right - RESPOND */}
        <div className="absolute bottom-6 right-2 sm:right-4 z-20 flex items-center gap-3 bg-[#060a0f]/90 border border-white/10 px-3.5 py-2.5 rounded-xl backdrop-blur-md shadow-lg">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-slate-200">
            <MessageSquare className="w-4 h-4 text-slate-200" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs font-semibold text-white tracking-wider">RESPOND</div>
            <div className="text-[11px] text-slate-400">Accurate • Helpful • Fast</div>
          </div>
          {/* Subtle pointer line toward nucleus */}
          <div className="hidden sm:block absolute -left-8 top-1/2 w-8 h-[1px] bg-gradient-to-l from-white/15 to-transparent pointer-events-none" />
        </div>

        {/* Center Nucleus: supplied image + living overlay */}
        <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] flex items-center justify-center pointer-events-none">
          {/* Base: nucleus image, edge-faded into the panel */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              WebkitMaskImage: 'radial-gradient(circle at center, #000 46%, transparent 70%)',
              maskImage: 'radial-gradient(circle at center, #000 46%, transparent 70%)',
            }}
          >
            <img
              ref={imgRef}
              src="/nucleus.jpg"
              alt="BUJJI nucleus"
              draggable={false}
              className="absolute max-w-none will-change-transform"
              style={{ width: '140.6%', height: '140.6%', left: '-20.3%', top: '-20.3%' }}
            />
          </div>

          {/* Twinkle / glow overlay */}
          <canvas ref={canvasRef} width={340} height={340} className="absolute inset-0 w-full h-full" />

          {/* Thin orbit rings + muted red accent arcs */}
          <svg viewBox="0 0 340 340" className="absolute inset-0 w-full h-full">
            <circle cx="170" cy="170" r="138" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx="170" cy="170" r="156" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            <g className="nucleus-orbit">
              <path d="M 32 170 A 138 138 0 0 1 60 87" fill="none" stroke="rgba(201,112,107,0.55)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 308 170 A 138 138 0 0 1 280 253" fill="none" stroke="rgba(201,112,107,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <line x1="0" y1="170" x2="14" y2="170" stroke="rgba(255,255,255,0.15)" />
            <line x1="326" y1="170" x2="340" y2="170" stroke="rgba(255,255,255,0.15)" />
          </svg>

          {/* Center label */}
          <span className="relative z-10 text-[19px] font-semibold tracking-[0.32em] pl-[0.32em] text-white/95 [text-shadow:0_0_14px_rgba(0,0,0,0.95)]">
            BUJJI
          </span>
        </div>
      </div>

      {/* State Status Pill */}
      <div className="mt-1 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#060a0f] border border-white/10 text-xs font-mono tracking-widest text-slate-300">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span>{statusText}</span>
      </div>
    </div>
  );
};
