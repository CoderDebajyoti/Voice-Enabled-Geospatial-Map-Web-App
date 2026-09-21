import React, { useEffect, useRef } from 'react';
import { useMapState } from '../context/MapStateContext';
import { Terminal, User, Bot, X, Trash2, Clock } from 'lucide-react';

const CommandLog = () => {
  const { commandsLog, clearCommandLog, isLogOpen, setIsLogOpen } = useMapState();
  const logEndRef = useRef(null);

  useEffect(() => {
    if (isLogOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandsLog, isLogOpen]);

  if (!isLogOpen) return null;

  return (
    <div className="w-full max-w-sm bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md flex flex-col pointer-events-auto select-none overflow-hidden h-72 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            Activity & Voice Log
          </span>
        </div>

        <div className="flex items-center gap-1">
          {commandsLog.length > 0 && (
            <button
              onClick={clearCommandLog}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Clear log"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={() => setIsLogOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close log"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar text-xs">
        {commandsLog.length === 0 ? (
          <div className="text-slate-400 text-xs italic text-center py-10">
            No activity yet. Try saying "Locate me" or "Fly to London".
          </div>
        ) : (
          commandsLog.map((log) => (
            <div key={log.id} className="flex flex-col gap-1">
              {log.type === 'user' ? (
                <div className="flex items-start gap-2 text-slate-200 bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                  <User size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-100">"{log.text}"</div>
                    {log.time && <div className="text-[10px] text-slate-400 mt-0.5">{log.time}</div>}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-slate-300 ml-3 border-l-2 border-blue-500/50 pl-2.5 py-1">
                  <Bot size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300 text-[11px] leading-relaxed">{log.text}</span>
                    {log.time && <div className="text-[10px] text-slate-400 mt-0.5">{log.time}</div>}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default CommandLog;
