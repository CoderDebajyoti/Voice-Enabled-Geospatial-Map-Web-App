import React, { useState } from 'react';
import { useMapState } from '../context/MapStateContext';
import { useLocation } from '../hooks/useLocation';
import {
  Crosshair,
  Plus,
  Minus,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  MapPin,
  Compass
} from 'lucide-react';

const MapControls = () => {
  const {
    mapLayer,
    setMapLayer,
    setTargetLocation,
    nearbyPlaces,
    isNearbyOpen,
    setIsNearbyOpen
  } = useMapState();

  const { userLocation, locationPermission, recenterUserLocation, requestUserLocation } = useLocation();
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const handleZoom = (direction) => {
    setTargetLocation({ zoomOnly: direction, timestamp: Date.now() });
  };

  const handleLocateClick = () => {
    if (locationPermission === 'denied') {
      // Re-trigger permission request
      requestUserLocation(true, true);
    } else {
      recenterUserLocation();
    }
  };

  const handleResetView = () => {
    setTargetLocation({
      lon: 78.9629,
      lat: 20.5937,
      zoom: 4,
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex flex-col items-end gap-2 pointer-events-auto select-none">
      {/* Layer Switcher Card Popover */}
      {showLayerMenu && (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2 shadow-lg backdrop-blur-md mb-1 w-36 animate-fade-in flex flex-col gap-1 text-xs">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Map Style
          </div>
          <button
            onClick={() => {
              setMapLayer('streets');
              setShowLayerMenu(false);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
              mapLayer === 'streets'
                ? 'bg-blue-600/20 text-blue-300 font-medium'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Standard
          </button>
          <button
            onClick={() => {
              setMapLayer('light');
              setShowLayerMenu(false);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
              mapLayer === 'light'
                ? 'bg-blue-600/20 text-blue-300 font-medium'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            Clean Light
          </button>
          <button
            onClick={() => {
              setMapLayer('satellite');
              setShowLayerMenu(false);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
              mapLayer === 'satellite'
                ? 'bg-blue-600/20 text-blue-300 font-medium'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Satellite
          </button>
        </div>
      )}

      {/* Main Control Pill Stack */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-md p-1 flex flex-col gap-1 backdrop-blur-md">
        {/* Locate Me Button */}
        <button
          onClick={handleLocateClick}
          disabled={locationPermission === 'loading'}
          className={`p-2 rounded-lg transition-all relative group flex items-center justify-center ${
            locationPermission === 'loading'
              ? 'text-blue-400 bg-slate-800'
              : userLocation
              ? 'text-blue-400 hover:bg-slate-800 hover:text-blue-300'
              : locationPermission === 'denied'
              ? 'text-rose-400 hover:bg-rose-950/40'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title={
            locationPermission === 'loading'
              ? 'Detecting your location...'
              : userLocation
              ? `Center on your location (${userLocation.name})`
              : locationPermission === 'denied'
              ? 'Location permission denied. Click to retry.'
              : 'Find my location'
          }
        >
          {locationPermission === 'loading' ? (
            <Loader2 size={17} className="animate-spin text-blue-400" />
          ) : locationPermission === 'denied' ? (
            <AlertCircle size={17} className="text-rose-400" />
          ) : (
            <Crosshair size={17} />
          )}

          {/* Quick hover label */}
          <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            {userLocation ? 'Locate me' : 'Find my location'}
          </span>
        </button>

        <div className="h-px bg-slate-800 mx-1" />

        {/* Zoom In */}
        <button
          onClick={() => handleZoom('in')}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          title="Zoom in"
        >
          <Plus size={17} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoom('out')}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          title="Zoom out"
        >
          <Minus size={17} />
        </button>

        <div className="h-px bg-slate-800 mx-1" />

        {/* Layer Switcher Trigger */}
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className={`p-2 rounded-lg transition-colors ${
            showLayerMenu ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Change map style"
        >
          <Layers size={17} />
        </button>

        {/* Nearby POIs Toggle */}
        <button
          onClick={() => setIsNearbyOpen(!isNearbyOpen)}
          className={`p-2 rounded-lg transition-colors relative ${
            isNearbyOpen ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Explore nearby places"
        >
          <MapPin size={17} />
          {nearbyPlaces.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        {/* Reset View */}
        <button
          onClick={handleResetView}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title="Reset map view"
        >
          <Compass size={17} />
        </button>
      </div>
    </div>
  );
};

export default MapControls;
