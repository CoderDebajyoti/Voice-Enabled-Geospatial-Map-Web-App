import React, { createContext, useContext, useState, useRef } from 'react';

const MapStateContext = createContext();

export const MapStateProvider = ({ children }) => {
  const [mapMode, setMapMode] = useState('2D'); // '2D' or '3D'
  const [language, setLanguage] = useState('en-US'); // 'en-US', 'hi-IN', 'bn-IN'
  const [commandsLog, setCommandsLog] = useState([]);
  
  // Shared coordinates to fly to, an object like { lon, lat, zoom, timestamp }
  const [targetLocation, setTargetLocation] = useState(null);

  const addCommandLog = (text, type = 'user') => {
    setCommandsLog(prev => [...prev, { id: Date.now(), text, type }]);
  };

  return (
    <MapStateContext.Provider value={{
      mapMode, setMapMode,
      language, setLanguage,
      commandsLog, addCommandLog,
      targetLocation, setTargetLocation
    }}>
      {children}
    </MapStateContext.Provider>
  );
};

export const useMapState = () => useContext(MapStateContext);
