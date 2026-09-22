import React, { useState } from 'react';
import { useMapState } from '../context/MapStateContext';
import { useLocation } from '../hooks/useLocation';
import { calculateRoute } from '../services/routingService';
import {
  Compass,
  Crosshair,
  X,
  Navigation2,
  HeartPulse,
  Pill,
  Utensils,
  Bus,
  Bath,
  CircleDollarSign,
  Fuel,
  Shield,
  Trees,
  Landmark
} from 'lucide-react';

const NearbyPanel = () => {
  const {
    nearbyPlaces,
    isNearbyOpen,
    setIsNearbyOpen,
    selectedPlace,
    setSelectedPlace,
    setTargetLocation,
    userLocation,
    activeCategory,
    setActiveCategory,
    setActiveRoute,
    addCommandLog
  } = useMapState();

  const { recenterUserLocation } = useLocation();

  if (!isNearbyOpen) return null;

  const filteredPlaces = nearbyPlaces.filter((p) => {
    if (activeCategory === 'all') return true;
    const cat = (p.category || '').toLowerCase();
    return cat.includes(activeCategory.toLowerCase());
  });

  const getCategoryIcon = (category) => {
    const c = (category || '').toLowerCase();
    if (c.includes('hospital')) return <HeartPulse size={13} className="text-rose-400" />;
    if (c.includes('pharmacy')) return <Pill size={13} className="text-emerald-400" />;
    if (c.includes('food') || c.includes('restaurant') || c.includes('cafe'))
      return <Utensils size={13} className="text-amber-400" />;
    if (c.includes('restroom') || c.includes('toilet'))
      return <Bath size={13} className="text-cyan-400" />;
    if (c.includes('atm') || c.includes('bank'))
      return <CircleDollarSign size={13} className="text-blue-400" />;
    if (c.includes('transit') || c.includes('station'))
      return <Bus size={13} className="text-indigo-400" />;
    if (c.includes('fuel') || c.includes('petrol'))
      return <Fuel size={13} className="text-orange-400" />;
    if (c.includes('police')) return <Shield size={13} className="text-blue-500" />;
    if (c.includes('park')) return <Trees size={13} className="text-emerald-400" />;
    return <Landmark size={13} className="text-slate-400" />;
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

  const handleRouteToPlace = async (e, place) => {
    e.stopPropagation();
    setSelectedPlace(place);

    const startCoords = userLocation
      ? { lon: userLocation.lon, lat: userLocation.lat }
      : { lon: 78.9629, lat: 20.5937 };

    const endCoords = { lon: place.lon, lat: place.lat };

    addCommandLog(`Routing to ${place.name}...`, 'system');
    const routeData = await calculateRoute(startCoords, endCoords);

    if (routeData) {
      setActiveRoute({
        ...routeData,
        destinationName: place.name,
        destinationCoords: endCoords,
        timestamp: Date.now()
      });

      setTargetLocation({
        lon: (startCoords.lon + endCoords.lon) / 2,
        lat: (startCoords.lat + endCoords.lat) / 2,
        zoom: 13,
        timestamp: Date.now()
      });

      addCommandLog(
        `Route to ${place.name}: ${routeData.distanceKm} km (~${routeData.durationFormatted})`,
        'system'
      );
    }
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'hospital', label: 'Hospitals' },
    { id: 'pharmacy', label: 'Pharmacies' },
    { id: 'food', label: 'Food & Dining' },
    { id: 'restroom', label: 'Restrooms' },
    { id: 'atm', label: 'ATM & Banks' },
    { id: 'transit', label: 'Transit' },
    { id: 'petrol', label: 'Fuel / Petrol' }
  ];

  return (
    <div className="w-full max-w-sm bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md text-slate-100 overflow-hidden pointer-events-auto select-none flex flex-col max-h-[400px] animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Compass size={14} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100">
              {userLocation?.name ? `Near ${userLocation.name}` : 'Nearby Results'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {filteredPlaces.length} locations discovered
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

      {/* Category Filter Tabs */}
      <div className="px-3 py-2 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar bg-slate-900/40">
        {categories.map((cat) => (
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
                <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(place.category || place.type)}
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
                  <button
                    onClick={(e) => handleRouteToPlace(e, place)}
                    className="p-1 rounded-md bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-400 transition-colors"
                    title="Find route to this location"
                  >
                    <Navigation2 size={13} />
                  </button>
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
