import React from 'react';
import Map2D from './components/Map2D';
import Map3D from './components/Map3D';
import Header from './components/Header';
import MapControls from './components/MapControls';
import VoiceControl from './components/VoiceControl';
import CommandLog from './components/CommandLog';
import NearbyPanel from './components/NearbyPanel';
import { MapStateProvider, useMapState } from './context/MapStateContext';
import { useLocation } from './hooks/useLocation';
import { AlertCircle, Navigation2, X, Clock } from 'lucide-react';

const MapAppContent = () => {
  const { locationPermission, userLocation, activeRoute, setActiveRoute } = useMapState();
  const { recenterUserLocation, requestUserLocation } = useLocation();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Map Canvas Views (2D OpenLayers & 3D Cesium) */}
      <Map2D />
      <Map3D />

      {/* 2. Top Header Navigation */}
      <div className="absolute top-0 inset-x-0 z-20">
        <Header />
      </div>

      {/* 3. Location Permission Banner (non-intrusive, only if denied) */}
      {locationPermission === 'denied' && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
          <div className="bg-slate-900/95 border border-rose-500/40 text-rose-200 px-4 py-2 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3 text-xs pointer-events-auto">
            <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
            <span>Location permission disabled. Enable it to unlock "You are here" and nearby places.</span>
            <button
              onClick={() => requestUserLocation(true, true)}
              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Navigation Route Banner (Clean, product-grade indicator) */}
      {activeRoute && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
          <div className="bg-slate-900/95 border border-blue-500/50 text-slate-100 px-4 py-2 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-3 text-xs pointer-events-auto animate-fade-in">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <Navigation2 size={13} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">{activeRoute.destinationName}</span>
              <span className="text-slate-400">·</span>
              <span className="text-blue-400 font-medium">{activeRoute.distanceKm} km</span>
              <span className="text-slate-400">·</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock size={11} className="text-slate-400" />
                {activeRoute.durationFormatted}
              </span>
            </div>
            <button
              onClick={() => setActiveRoute(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Clear route"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Left Context Area (Nearby Places & Activity Log) */}
      <div className="absolute top-16 left-4 z-20 flex flex-col gap-3 pointer-events-none max-w-sm">
        <NearbyPanel />
        <CommandLog />
      </div>

      {/* 6. Right Map Controls */}
      <div className="absolute top-16 right-4 z-20">
        <MapControls />
      </div>

      {/* 7. Bottom Floating Voice Assistant Trigger */}
      <div className="absolute bottom-6 right-4 sm:bottom-6 sm:right-6 z-20">
        <VoiceControl />
      </div>

      {/* 8. Bottom Left Quick Status Pill ("You are here" indicator) */}
      {userLocation && (
        <div className="absolute bottom-6 left-4 z-10 pointer-events-auto">
          <button
            onClick={recenterUserLocation}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 text-xs text-slate-300 shadow-md backdrop-blur-md transition-all group cursor-pointer"
            title="Click to center on your location"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="font-medium text-slate-200">You are here: {userLocation.name}</span>
            {userLocation.city && <span className="text-slate-400 text-[11px]">· {userLocation.city}</span>}
          </button>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <MapStateProvider>
      <MapAppContent />
    </MapStateProvider>
  );
}

export default App;
