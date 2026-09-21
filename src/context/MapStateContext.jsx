import React, { createContext, useContext, useState, useCallback } from 'react';

const MapStateContext = createContext();

export const MapStateProvider = ({ children }) => {
  const [mapMode, setMapMode] = useState('2D'); // '2D' or '3D'
  const [language, setLanguage] = useState('en-US'); // 'en-US', 'hi-IN', 'bn-IN'
  const [mapLayer, setMapLayer] = useState('streets'); // 'streets', 'satellite', 'light'
  
  // Commands & Interaction history
  const [commandsLog, setCommandsLog] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Target navigation location: { lon, lat, zoom, label, timestamp, zoomOnly }
  const [targetLocation, setTargetLocation] = useState(null);

  // User location state
  const [userLocation, setUserLocation] = useState(null); // { lat, lon, name, accuracy, city }
  const [locationPermission, setLocationPermission] = useState('idle'); // 'idle' | 'loading' | 'granted' | 'denied' | 'error'
  const [locationError, setLocationError] = useState(null);

  // Nearby discovery state
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Voice recognition status: 'idle' | 'listening' | 'processing' | 'response'
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceMessage, setVoiceMessage] = useState('');

  const addCommandLog = useCallback((text, type = 'user') => {
    setCommandsLog((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text,
        type,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    ]);
  }, []);

  const clearCommandLog = useCallback(() => {
    setCommandsLog([]);
  }, []);

  return (
    <MapStateContext.Provider
      value={{
        mapMode,
        setMapMode,
        language,
        setLanguage,
        mapLayer,
        setMapLayer,
        commandsLog,
        addCommandLog,
        clearCommandLog,
        isLogOpen,
        setIsLogOpen,
        targetLocation,
        setTargetLocation,
        userLocation,
        setUserLocation,
        locationPermission,
        setLocationPermission,
        locationError,
        setLocationError,
        nearbyPlaces,
        setNearbyPlaces,
        selectedPlace,
        setSelectedPlace,
        isNearbyOpen,
        setIsNearbyOpen,
        activeCategory,
        setActiveCategory,
        voiceStatus,
        setVoiceStatus,
        voiceMessage,
        setVoiceMessage
      }}
    >
      {children}
    </MapStateContext.Provider>
  );
};

export const useMapState = () => {
  const context = useContext(MapStateContext);
  if (!context) {
    throw new Error('useMapState must be used within a MapStateProvider');
  }
  return context;
};
