import React from 'react';
import { useMapState } from '../context/MapStateContext';
import { Map, Globe, Languages } from 'lucide-react';

const UIControls = () => {
  const { mapMode, setMapMode, language, setLanguage } = useMapState();

  return (
    <div className="flex flex-col sm:flex-row gap-3 pointer-events-auto">
      {/* Map Mode Toggle */}
      <div className="glass-panel-dark flex items-center p-1 rounded-xl">
        <button
          onClick={() => setMapMode('2D')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            mapMode === '2D' ? 'bg-blue-500/80 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Map size={18} />
          <span className="font-semibold text-sm">2D Map</span>
        </button>
        <button
          onClick={() => setMapMode('3D')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            mapMode === '3D' ? 'bg-emerald-500/80 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe size={18} />
          <span className="font-semibold text-sm">3D Globe</span>
        </button>
      </div>

      {/* Language Selector */}
      <div className="glass-panel-dark flex items-center px-4 py-2 rounded-xl gap-3">
        <Languages size={18} className="text-gray-400" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer appearance-none outline-none"
        >
          <option value="en-US" className="bg-gray-900 text-white">English</option>
          <option value="hi-IN" className="bg-gray-900 text-white">Hindi (हिंदी)</option>
          <option value="bn-IN" className="bg-gray-900 text-white">Bengali (বাংলা)</option>
        </select>
      </div>
    </div>
  );
};

export default UIControls;
