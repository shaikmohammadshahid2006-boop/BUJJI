import React, { useState } from 'react';
import { Volume2, Copy, Check, Bot, User } from 'lucide-react';
import { Message } from '../types/conversation';
import { ActionCard } from './ActionCard';
import { formatTimestamp } from '../lib/utils';

interface ChatMessageProps {
  message: Message;
  onSpeak?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSpeak }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full gap-3 py-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className="max-w-[85%] md:max-w-[75%] space-y-1.5">
        {/* Header with name and timestamp */}
        <div className={`flex items-center gap-2 text-[11px] font-mono text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-semibold text-slate-300 tracking-wider">
            {isUser ? 'COMMANDER' : 'BUJJI'}
          </span>
          {message.created_at && (
            <span className="text-slate-500">• {formatTimestamp(message.created_at)}</span>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={`p-3.5 rounded-xl text-sm leading-relaxed border ${
            isUser
              ? 'bg-[#0a121c] border-white/15 text-slate-100'
              : 'bg-[#05090f] border-white/10 text-slate-200'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>

          {/* Action card if action returned */}
          {message.action && message.action !== 'none' && (
            <ActionCard action={message.action} data={message.metadata} />
          )}

          {/* Assistant Action bar: Replay Voice & Copy */}
          {!isUser && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-3 text-xs text-slate-400">
              {onSpeak && (
                <button
                  onClick={() => onSpeak(message.content)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                  title="Speak response"
                >
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Speak</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-white transition-colors"
                title="Copy text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
