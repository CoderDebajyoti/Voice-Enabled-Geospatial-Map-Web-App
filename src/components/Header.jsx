import React, { useState } from 'react';
import { useMapState } from '../context/MapStateContext';
import { useActiveUsers } from '../hooks/useActiveUsers';
import { useSpeech } from '../hooks/useSpeech';
import {
  Compass,
  Search,
  Map as MapIcon,
  Globe,
  Languages,
  History,
  X
} from 'lucide-react';

const Header = () => {
  const {
    mapMode,
    setMapMode,
    language,
    setLanguage,
    detectedLanguage,
    isLogOpen,
    setIsLogOpen,
    commandsLog,
    userLocation
  } = useMapState();

  const { processManualCommand } = useSpeech();
  const activeUsers = useActiveUsers(26);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    await processManualCommand(searchQuery.trim());
    setIsSearching(false);
  };

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 select-none pointer-events-auto shadow-sm">
      {/* Brand & Live Metric */}
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">GeoVoice</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                Maps
              </span>
            </div>
          </div>
        </div>

        {/* Active User Metric (Human, Product-grade metric) */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300"
          title="Live active users currently connected to the map"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-slate-200">{activeUsers}</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">active users</span>
        </div>
      </div>

      {/* Center: Search / Prompt Bar */}
      <div className="w-full md:max-w-md lg:max-w-lg">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              userLocation?.name
                ? `Ask or search in English, বাংলা, हिंदी near ${userLocation.name}...`
                : 'Search or ask naturally in English, বাংলা, हिंदी...'
            }
            className="w-full pl-9 pr-8 py-1.5 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/70 focus:border-blue-500 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </form>
      </div>

      {/* Right Controls: Mode Toggle, Language, History */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {/* 2D / 3D Segmented Control */}
        <div className="flex items-center bg-slate-800 border border-slate-700/80 p-0.5 rounded-lg">
          <button
            onClick={() => setMapMode('2D')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mapMode === '2D'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            title="2D Map View"
          >
            <MapIcon size={13} />
            <span>2D</span>
          </button>
          <button
            onClick={() => setMapMode('3D')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mapMode === '3D'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            title="3D Globe View"
          >
            <Globe size={13} />
            <span>3D</span>
          </button>
        </div>

        {/* Language Selector (Auto Multilingual / English / Hindi / Bengali) */}
        <div className="flex items-center bg-slate-800 border border-slate-700/80 px-2 py-1 rounded-lg gap-1.5 text-xs text-slate-300">
          <Languages size={13} className="text-slate-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
            aria-label="Language selection"
          >
            <option value="auto" className="bg-slate-900 text-slate-100">
              Auto (EN/বাংলা/हिंदी)
            </option>
            <option value="en-US" className="bg-slate-900 text-slate-100">
              English (EN)
            </option>
            <option value="bn-IN" className="bg-slate-900 text-slate-100">
              বাংলা (BN)
            </option>
            <option value="hi-IN" className="bg-slate-900 text-slate-100">
              हिंदी (HI)
            </option>
          </select>
        </div>

        {/* Activity Log Popover Trigger */}
        <button
          onClick={() => setIsLogOpen(!isLogOpen)}
          className={`relative p-1.5 rounded-lg border text-xs transition-colors ${
            isLogOpen
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
          title="Command History & Activity Log"
        >
          <History size={15} />
          {commandsLog.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {commandsLog.length > 9 ? '9+' : commandsLog.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
