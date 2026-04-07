import React, { useEffect, useRef } from 'react';
import { useMapState } from '../context/MapStateContext';
import { Terminal, User, Bot } from 'lucide-react';

const CommandLog = () => {
  const { commandsLog } = useMapState();
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commandsLog]);

  return (
    <div className="glass-panel-dark w-full max-w-sm h-48 flex flex-col pointer-events-auto rounded-xl overflow-hidden mt-4 shadow-2xl border-white/10">
      <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center gap-2">
        <Terminal size={14} className="text-emerald-400" />
        <span className="text-xs font-semibold text-gray-300 tracking-wider">SYSTEM LOG</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {commandsLog.length === 0 ? (
          <div className="text-gray-500 text-xs italic text-center mt-10">
            Awaiting voice commands...
          </div>
        ) : (
          commandsLog.map((log) => (
            <div key={log.id} className="text-sm flex flex-col gap-1">
              {log.type === 'user' ? (
                <div className="flex items-start gap-2 text-blue-300">
                  <User size={14} className="mt-0.5 flex-shrink-0" />
                  <span className="font-medium">"{log.text}"</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-emerald-300 ml-4 border-l border-emerald-500/30 pl-3 py-1 bg-emerald-500/5 rounded-r-lg">
                  <Bot size={14} className="mt-0.5 flex-shrink-0" />
                  <span className="opacity-90 text-xs">{log.text}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
      `}} />
    </div>
  );
};

export default CommandLog;
