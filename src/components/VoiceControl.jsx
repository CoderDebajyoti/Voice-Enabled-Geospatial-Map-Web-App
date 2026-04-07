import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

const VoiceControl = () => {
  const { isListening, transcript, toggleListening } = useSpeech();

  return (
    <div className="flex flex-col items-end gap-3 pointer-events-none">
      {/* Transcript Tooltip Overlay */}
      {isListening && transcript && (
        <div className="glass-panel-dark px-4 py-2 text-sm text-center max-w-[250px] animate-fade-in pointer-events-auto">
          <span className="text-gray-300 italic">Listening:</span>
          <br/>
          <span className="font-medium text-white">{transcript}</span>
        </div>
      )}

      {/* Mic Button */}
      <button
        onClick={toggleListening}
        className={`relative p-5 rounded-full flex items-center justify-center transition-all pointer-events-auto shadow-2xl overflow-hidden group
          ${isListening 
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]' 
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }
        `}
      >
        {/* Pulse effect rings */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-rose-300 animate-pulse opacity-50"></div>
          </>
        )}
        
        <div className="relative z-10 flex flex-col items-center">
          {isListening ? (
             <Mic className="h-7 w-7 animate-bounce" />
          ) : (
             <MicOff className="h-7 w-7 group-hover:scale-110 transition-transform" />
          )}
        </div>
      </button>
    </div>
  );
};

export default VoiceControl;
