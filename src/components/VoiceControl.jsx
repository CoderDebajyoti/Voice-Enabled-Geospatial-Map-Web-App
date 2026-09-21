import React from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { Mic, MicOff, Loader2, Sparkles, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';

const VoiceControl = () => {
  const { voiceStatus, transcript, voiceMessage, toggleListening } = useSpeech();

  return (
    <div className="flex flex-col items-center sm:items-end gap-2 pointer-events-none select-none">
      {/* 1. Live Interim Transcript Bubble */}
      {voiceStatus === 'listening' && (
        <div className="bg-slate-900/95 border border-amber-500/40 px-3.5 py-2 rounded-xl text-xs shadow-lg backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex items-center gap-2">
          <div className="flex gap-0.5 items-center">
            <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
            <span className="w-1 h-4 bg-amber-400 rounded-full animate-pulse delay-75" />
            <span className="w-1 h-2 bg-amber-400 rounded-full animate-pulse delay-150" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              Listening...
            </div>
            <div className="text-slate-100 font-medium truncate">
              {transcript || 'Speak now (e.g. "Go to Paris", "Locate me", "Zoom in")'}
            </div>
          </div>
        </div>
      )}

      {/* 2. Processing Spinner Bubble */}
      {voiceStatus === 'processing' && (
        <div className="bg-slate-900/95 border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs shadow-lg backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex items-center gap-2.5">
          <Loader2 size={15} className="animate-spin text-blue-400 flex-shrink-0" />
          <span className="text-slate-200 font-medium">{voiceMessage || 'Understanding command...'}</span>
        </div>
      )}

      {/* 3. Response Feedback Bubble */}
      {voiceStatus === 'response' && voiceMessage && (
        <div className="bg-slate-900/95 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs shadow-lg backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex items-center gap-2.5">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <span className="text-slate-100 font-medium">{voiceMessage}</span>
        </div>
      )}

      {/* 4. Sleek Voice Trigger Button with State Awareness */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={toggleListening}
          className={`relative p-3.5 sm:p-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg group ${
            voiceStatus === 'listening'
              ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30 scale-105'
              : voiceStatus === 'processing'
              ? 'bg-blue-600 text-white ring-4 ring-blue-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600'
          }`}
          title={
            voiceStatus === 'listening'
              ? 'Listening... Click to stop'
              : voiceStatus === 'processing'
              ? 'Processing speech...'
              : 'Voice Assistant — Click to speak'
          }
        >
          {voiceStatus === 'listening' ? (
            <Mic className="h-5 w-5 animate-pulse" />
          ) : voiceStatus === 'processing' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceControl;
