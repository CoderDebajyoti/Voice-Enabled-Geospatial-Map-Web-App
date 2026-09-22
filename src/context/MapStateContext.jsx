import React, { createContext, useContext, useState, useCallback } from 'react';

const MapStateContext = createContext();

export const MapStateProvider = ({ children }) => {
  const [mapMode, setMapMode] = useState('2D'); // '2D' or '3D'
  const [language, setLanguage] = useState('auto'); // 'auto', 'en-US', 'bn-IN', 'hi-IN'
  const [detectedLanguage, setDetectedLanguage] = useState(null); // { code: 'bn', label: 'বাংলা' }
  const [mapLayer, setMapLayer] = useState('streets'); // 'streets', 'satellite', 'light'
  
  // Commands & Interaction history
  const [commandsLog, setCommandsLog] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Target navigation location: { lon, lat, zoom, label, timestamp, zoomOnly, isUserLocation }
  const [targetLocation, setTargetLocation] = useState(null);

  // User location state: { lat, lon, name, accuracy, city, fullAddress }
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('idle'); // 'idle' | 'loading' | 'granted' | 'denied' | 'error'
  const [locationError, setLocationError] = useState(null);

  // Nearby discovery state
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Voice recognition & Conversational Context
  const [voiceStatus, setVoiceStatus] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'response' | 'clarifying'
  const [voiceMessage, setVoiceMessage] = useState('');
  const [lastVoiceIntent, setLastVoiceIntent] = useState(null);
  const [pendingClarification, setPendingClarification] = useState(null);

  // Active Navigation Route: { coordinates: [[lon, lat], ...], distanceKm, durationFormatted, steps }
  const [activeRoute, setActiveRoute] = useState(null);

  // Saved Home / Work coordinates (defaulting to user location or preset)
  const [homeLocation, setHomeLocation] = useState(null);

  const addCommandLog = useCallback((text, type = 'user', extra = null) => {
    setCommandsLog((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text,
        type,
        extra,
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
        detectedLanguage,
        setDetectedLanguage,
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
        setVoiceMessage,
        lastVoiceIntent,
        setLastVoiceIntent,
        pendingClarification,
        setPendingClarification,
        activeRoute,
        setActiveRoute,
        homeLocation,
        setHomeLocation
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
