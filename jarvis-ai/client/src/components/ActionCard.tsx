import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Play, Search, Monitor, Cpu, Brain, Volume2, VolumeX, ShieldAlert, Newspaper } from 'lucide-react';
import { ActionType, AssistantResponseData } from '../types/assistant';
import { executeClientAction } from '../lib/actionHandler';

interface ActionCardProps {
  action?: ActionType | string;
  data?: AssistantResponseData;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action, data }) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  if (!action || action === 'none' || !data) return null;

  const handleCopy = async () => {
    if (data.clipboard_text) {
      await executeClientAction('copy_text', data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenUrl = () => {
    executeClientAction('open_url', data);
  };

  // Helper to extract YouTube ID
  const getYouTubeId = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  // 1. Mark LV HUD Inline Video Player
  if (action === 'play_media' || (action === 'open_url' && data.url?.includes('youtube.com'))) {
    const videoId = getYouTubeId(data.url);

    return (
      <div className="mt-3 p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,229,255,0.2)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <Play className="w-4 h-4 fill-red-500 text-red-500" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">HUD MEDIA DISPLAY (MARK LV)</div>
              <div className="text-sm font-semibold text-slate-100 truncate max-w-sm">{data.title || data.query || 'Media Stream'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {videoId && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
                title={isMuted ? "Sound on" : "Mute sound"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            )}
            <button
              onClick={handleOpenUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-colors"
            >
              <span>Watch External</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {videoId && (
          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-black shadow-inner">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1`}
              title={data.title || "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        )}
      </div>
    );
  }

  // 2. Mark LV Hardware Telemetry Card
  if (action === 'system_telemetry') {
    const metrics = data;
    return (
      <div className="mt-3 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>HARDWARE TELEMETRY & SYSTEM HEALTH</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            NORMAL TELEMETRY
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase">CPU Load</div>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">{metrics.cpu_percent}%</div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, metrics.cpu_percent)}%` }} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase">Memory RAM</div>
            <div className="text-lg font-bold text-blue-300 mt-0.5">{metrics.ram_percent}%</div>
            <div className="text-[10px] text-slate-500">{metrics.ram_used_gb} / {metrics.ram_total_gb} GB</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase">Disk Storage</div>
            <div className="text-lg font-bold text-purple-300 mt-0.5">{metrics.disk_percent}%</div>
            <div className="text-[10px] text-slate-500">{metrics.disk_free_gb} GB Free</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase">Uptime</div>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">{metrics.uptime}</div>
            <div className="text-[10px] text-slate-500">{metrics.process_count} Tasks</div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Mark LV Morning Briefing Card
  if (action === 'briefing') {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-soate-900/90 to-blue-950/40 border border-cyan-500/40 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Newspaper className="w-4 h-4 text-cyan-400" />
            <span>DAILY INTELLIGENCE BRIEFING</span>
          </div>
          <span className="text-[10px] text-slate-400">{data.timestamp}</span>
        </div>

        {data.headline_news && data.headline_news.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Top Global Tech Intelligence:</div>
            {data.headline_news.map((item: any, i: number) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-xl bg-slate-950/50 hover:bg-slate-950 border border-slate-800/60 hover:border-cyan-500/30 text-xs transition-all"
              >
                <div className="text-cyan-300 font-semibold truncate">{item.title}</div>
                <div className="text-slate-400 text-[11px] line-clamp-1">{item.snippet}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4. Mark LV Memory View Card
  if (action === 'memory_view') {
    const memory = data;
    return (
      <div className="mt-3 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2.5 font-mono text-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span>RECALLABLE LONG-TERM MEMORY (MARK LV)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {Object.entries(memory).map(([cat, items]) => {
            if (!items || typeof items !== 'object' || Object.keys(items).length === 0) return null;
            return (
              <div key={cat} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-cyan-400 uppercase font-bold tracking-wider mb-1">{cat}</div>
                <div className="space-y-1 text-slate-300">
                  {Object.entries(items as Record<string, any>).slice(0, 3).map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-slate-500">{k.replace('_', ' ')}:</span> {v.value || String(v)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. Mark LV Real Confirmation Gate
  if (action === 'ask_confirmation') {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3 font-mono">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          <span>OPERATIONAL CONFIRMATION REQUIRED</span>
        </div>
        <p className="text-xs text-slate-200">
          {data.prompt_question || "This irreversible action requires explicit clearance from the operator."}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setConfirmed(true)}
            disabled={confirmed !== null}
            className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wider transition-all disabled:opacity-50"
          >
            CONFIRM ACTION
          </button>
          <button
            onClick={() => setConfirmed(false)}
            disabled={confirmed !== null}
            className="px-4 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold tracking-wider transition-all disabled:opacity-50"
          >
            CANCEL
          </button>
          {confirmed !== null && (
            <span className="text-xs font-mono ml-2 text-slate-400">
              {confirmed ? "✓ Action confirmed" : "✕ Action aborted"}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 6. Web Search Results Card
  if (action === 'search_web') {
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>WEB INTELLIGENCE QUERY</span>
          </div>
          {data.url && (
            <button
              onClick={handleOpenUrl}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              <span>View Search</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        {data.results && data.results.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {data.results.slice(0, 3).map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-colors"
              >
                <div className="text-xs font-semibold text-cyan-300 truncate">{res.title}</div>
                <div className="text-xs text-slate-400 line-clamp-1">{res.snippet}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 7. General Safe URL Card
  if (action === 'open_url' || action === 'open_new_tab') {
    return (
      <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between gap-3">
        <div className="truncate">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Web Destination</div>
          <div className="text-sm font-medium text-slate-200 truncate">{data.title || data.url}</div>
        </div>
        <button
          onClick={handleOpenUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <span>Open Link</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // 8. Code / Text Copy Card
  if (action === 'copy_text' && data.clipboard_text) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-400">
          Generated snippet ready for clipboard
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // 9. Desktop Command Notice
  if (action === 'desktop_command') {
    return (
      <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-1">
        <div className="flex items-center gap-2 font-mono font-semibold text-amber-400">
          <Monitor className="w-4 h-4" />
          <span>DESKTOP AGENT COMPANION REQUIRED</span>
        </div>
        <p className="text-slate-300">
          Direct OS operations (e.g. launching desktop executables, volume slider, host shutdown) require running the local BUJJI Python companion agent on your personal machine.
        </p>
      </div>
    );
  }

  return null;
};
