import React from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { Mic, Loader2, CheckCircle2, HelpCircle, Check, X, Globe } from 'lucide-react';

const VoiceControl = () => {
  const {
    voiceStatus,
    transcript,
    voiceMessage,
    detectedLanguage,
    pendingClarification,
    toggleListening,
    confirmClarification,
    cancelClarification
  } = useSpeech();

  return (
    <div className="flex flex-col items-center sm:items-end gap-2 pointer-events-none select-none">
      {/* 1. Clarification Dialogue Bubble */}
      {voiceStatus === 'clarifying' && pendingClarification && (
        <div className="bg-slate-900 border border-amber-500/60 p-3 rounded-xl text-xs shadow-xl backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex flex-col gap-2">
          <div className="flex items-start gap-2 text-amber-400">
            <HelpCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="text-slate-100 font-medium text-xs leading-snug">
              {voiceMessage}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={cancelClarification}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
            >
              <X size={12} />
              <span>No</span>
            </button>
            <button
              onClick={confirmClarification}
              className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors shadow-sm"
            >
              <Check size={12} />
              <span>Yes</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Live Interim Transcript Bubble & Language Tag */}
      {voiceStatus === 'listening' && (
        <div className="bg-slate-900/95 border border-amber-500/40 px-3.5 py-2.5 rounded-xl text-xs shadow-lg backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex items-center gap-2.5">
          <div className="flex gap-0.5 items-center">
            <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
            <span className="w-1 h-4 bg-amber-400 rounded-full animate-pulse delay-75" />
            <span className="w-1 h-2 bg-amber-400 rounded-full animate-pulse delay-150" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Listening...
              </span>
              {detectedLanguage && (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60 flex items-center gap-1">
                  <Globe size={10} />
                  {detectedLanguage.label}
                </span>
              )}
            </div>
            <div className="text-slate-100 font-medium truncate mt-0.5">
              {transcript || 'Speak in English, বাংলা, हिंदी, or mixed...'}
            </div>
          </div>
        </div>
      )}

      {/* 3. Processing Spinner Bubble */}
      {voiceStatus === 'processing' && (
        <div className="bg-slate-900/95 border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs shadow-lg backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex items-center gap-2.5">
          <Loader2 size={15} className="animate-spin text-blue-400 flex-shrink-0" />
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
            <span className="text-slate-200 font-medium truncate">
              {voiceMessage || 'Understanding command...'}
            </span>
            {detectedLanguage && (
              <span className="text-[10px] text-blue-300 font-medium bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded">
                {detectedLanguage.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Response Feedback Bubble */}
      {voiceStatus === 'response' && voiceMessage && (
        <div className="bg-slate-900/95 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-xs shadow-lg backdrop-blur-md max-w-xs text-left animate-fade-in pointer-events-auto flex items-center gap-2.5">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <span className="text-slate-100 font-medium">{voiceMessage}</span>
        </div>
      )}

      {/* 5. Clean, Professional Microphone Trigger Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={toggleListening}
          className={`relative p-3.5 sm:p-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg group cursor-pointer ${
            voiceStatus === 'listening'
              ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30 scale-105'
              : voiceStatus === 'processing'
              ? 'bg-blue-600 text-white ring-4 ring-blue-600/30'
              : voiceStatus === 'clarifying'
              ? 'bg-amber-600 text-white ring-4 ring-amber-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600'
          }`}
          title={
            voiceStatus === 'listening'
              ? 'Listening... Click to stop'
              : voiceStatus === 'processing'
              ? 'Processing speech...'
              : 'Voice Assistant — Speak in English, বাংলা, हिंदी'
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
