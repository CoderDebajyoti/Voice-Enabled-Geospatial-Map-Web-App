import React, { useState } from 'react';
import { useMapState } from '../context/MapStateContext';
import { useLocation } from '../hooks/useLocation';
import {
  MapPin,
  Utensils,
  Bus,
  Trees,
  Landmark,
  Navigation2,
  X,
  ChevronRight,
  Crosshair,
  Compass
} from 'lucide-react';

const NearbyPanel = () => {
  const {
    nearbyPlaces,
    isNearbyOpen,
    setIsNearbyOpen,
    selectedPlace,
    setSelectedPlace,
    setTargetLocation,
    userLocation
  } = useMapState();

  const { recenterUserLocation } = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');

  if (!isNearbyOpen) return null;

  const filteredPlaces = nearbyPlaces.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.category === activeCategory;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'food':
        return <Utensils size={13} className="text-amber-400" />;
      case 'transit':
        return <Bus size={13} className="text-indigo-400" />;
      case 'parks':
        return <Trees size={13} className="text-emerald-400" />;
      default:
        return <Landmark size={13} className="text-blue-400" />;
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setTargetLocation({
      lon: place.lon,
      lat: place.lat,
      zoom: 16,
      label: place.name,
      timestamp: Date.now()
    });
  };

  return (
    <div className="w-full max-w-sm bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md text-slate-100 overflow-hidden pointer-events-auto select-none flex flex-col max-h-[380px] animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Compass size={14} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100">
              {userLocation?.name ? `Nearby ${userLocation.name}` : 'Nearby Places'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {filteredPlaces.length} points of interest discovered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {userLocation && (
            <button
              onClick={recenterUserLocation}
              className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 text-[11px] flex items-center gap-1 transition-colors"
              title="Return to your location"
            >
              <Crosshair size={13} />
            </button>
          )}
          <button
            onClick={() => setIsNearbyOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar bg-slate-900/40">
        {[
          { id: 'all', label: 'All' },
          { id: 'landmark', label: 'Landmarks' },
          { id: 'transit', label: 'Transit' },
          { id: 'food', label: 'Food & Cafes' },
          { id: 'parks', label: 'Parks' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Places List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
        {filteredPlaces.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            No places found in this category.
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const isSelected = selectedPlace?.id === place.id;
            return (
              <div
                key={place.id}
                onClick={() => handleSelectPlace(place)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/20 border border-blue-500/40'
                    : 'bg-slate-800/40 hover:bg-slate-800/90 border border-transparent hover:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(place.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{place.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {place.type?.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {place.distance !== undefined && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                      {place.distance < 1
                        ? `${Math.round(place.distance * 1000)} m`
                        : `${place.distance} km`}
                    </span>
                  )}
                  <Navigation2 size={12} className="text-slate-400 hover:text-blue-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NearbyPanel;
