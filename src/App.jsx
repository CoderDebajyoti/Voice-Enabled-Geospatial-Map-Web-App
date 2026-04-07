import React from 'react';
import Map2D from './components/Map2D';
import Map3D from './components/Map3D';
import UIControls from './components/UIControls';
import VoiceControl from './components/VoiceControl';
import CommandLog from './components/CommandLog';
import { MapStateProvider } from './context/MapStateContext';

function App() {
  return (
    <MapStateProvider>
      <div className="relative w-full h-screen overflow-hidden bg-gray-900 text-gray-800 font-sans">
        {/* Maps */}
        <Map2D />
        <Map3D />
        
        {/* Overlay UI */}
        <div className="absolute inset-x-0 top-0 pointer-events-none z-10 flex flex-col p-4 sm:p-6 justify-between h-full">
          {/* Top Panel: Title and Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="glass-panel-dark px-6 py-3 pointer-events-auto">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                GeoVoice AI
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide">3D MAPS & VOICE CONTROL</p>
            </div>
            
            <UIControls />
          </div>

          {/* Bottom Panel: Logs */}
          <div className="flex justify-between items-end w-full">
            <CommandLog />
          </div>
        </div>
        
        {/* Floating Voice Control - Right Bottom */}
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-20">
          <VoiceControl />
        </div>
      </div>
    </MapStateProvider>
  );
}

export default App;
