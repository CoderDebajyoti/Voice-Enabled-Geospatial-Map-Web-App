import { useState, useEffect, useRef, useCallback } from 'react';
import { useMapState } from '../context/MapStateContext';
import { parseVoiceCommand } from '../services/aiParser';
import { geocode } from '../services/geocoder';
import { fetchNearbyPOIs, reverseGeocode } from '../services/nearbyService';

export const useSpeech = () => {
  const {
    language,
    addCommandLog,
    setMapMode,
    setTargetLocation,
    userLocation,
    setUserLocation,
    setNearbyPlaces,
    setIsNearbyOpen,
    voiceStatus,
    setVoiceStatus,
    voiceMessage,
    setVoiceMessage
  } = useMapState();

  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Helper to set temporary feedback message
  const setFeedback = useCallback((msg, duration = 4000) => {
    setVoiceMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVoiceMessage('');
      setVoiceStatus('idle');
    }, duration);
  }, [setVoiceMessage, setVoiceStatus]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setVoiceStatus('listening');
      setTranscript('');
      setVoiceMessage('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }
      const combined = finalTranscript || interimTranscript;
      setTranscript(combined);
      if (finalTranscript) {
        recognitionRef.current.finalTranscriptStr = finalTranscript;
      }
    };

    recognition.onend = async () => {
      const finalTranscript = recognitionRef.current.finalTranscriptStr || transcript;
      if (finalTranscript && finalTranscript.trim().length > 0) {
        setVoiceStatus('processing');
        addCommandLog(finalTranscript, 'user');
        await processCommand(finalTranscript);
      } else {
        setVoiceStatus('idle');
      }
      setTranscript('');
      if (recognitionRef.current) {
        recognitionRef.current.finalTranscriptStr = '';
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        addCommandLog(`Voice error: ${event.error}`, 'system');
        setFeedback(`Voice error: ${event.error}`);
      } else {
        setVoiceStatus('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (e) {
        // ignore
      }
    };
  }, [language, addCommandLog, setVoiceStatus, setFeedback]);

  // Keep transcript updated on ref
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.finalTranscriptStr = transcript;
    }
  }, [transcript]);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const processCommand = async (text) => {
    setVoiceStatus('processing');
    setVoiceMessage('Understanding...');

    const intent = await parseVoiceCommand(text);

    if (intent.action === 'error') {
      addCommandLog(intent.message, 'system');
      setVoiceStatus('response');
      setFeedback(intent.message);
      speak("I encountered an issue processing that command.");
      return;
    }

    let responseText = '';

    // 1. Switch View Mode (2D / 3D)
    if (intent.action === 'switch_view' || intent.view_mode) {
      if (intent.view_mode === '2D') {
        setMapMode('2D');
        responseText = 'Switched to 2D map view.';
      } else if (intent.view_mode === '3D') {
        setMapMode('3D');
        responseText = 'Switched to 3D globe view.';
      }
    }

    // 2. Navigation / Fly To
    else if (intent.action === 'navigate' && intent.location) {
      addCommandLog(`Locating ${intent.location}...`, 'system');
      const coords = await geocode(intent.location);
      if (coords) {
        setTargetLocation({
          lon: coords.lon,
          lat: coords.lat,
          zoom: intent.zoom === 'in' ? 15 : intent.zoom === 'out' ? 6 : 13,
          label: coords.displayName?.split(',')[0] || intent.location,
          timestamp: Date.now()
        });

        // Also fetch nearby POIs for the searched place
        try {
          const pois = await fetchNearbyPOIs(coords.lat, coords.lon);
          if (pois && pois.length > 0) {
            setNearbyPlaces(pois);
            setIsNearbyOpen(true);
          }
        } catch (e) {
          // ignore
        }

        if (language === 'hi-IN') responseText = `${intent.location} की ओर जा रहे हैं।`;
        else if (language === 'bn-IN') responseText = `${intent.location}-এ যাচ্ছি।`;
        else responseText = `Navigating to ${intent.location}.`;
      } else {
        responseText = `Could not find "${intent.location}".`;
      }
    }

    // 3. Zoom Controls
    else if (intent.action === 'zoom' && intent.zoom) {
      setTargetLocation({ zoomOnly: intent.zoom, timestamp: Date.now() });
      responseText = `Zoomed ${intent.zoom}.`;
    }

    // 4. Locate Me
    else if (intent.action === 'locate_me') {
      if (userLocation) {
        setTargetLocation({
          lon: userLocation.lon,
          lat: userLocation.lat,
          zoom: 15,
          isUserLocation: true,
          label: userLocation.name,
          timestamp: Date.now()
        });
        responseText = `Centered on your location (${userLocation.name}).`;
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const geoInfo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          const name = geoInfo?.name || 'Current Location';
          setUserLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            name: name,
            city: geoInfo?.city || ''
          });
          setTargetLocation({
            lon: pos.coords.longitude,
            lat: pos.coords.latitude,
            zoom: 15,
            isUserLocation: true,
            label: name,
            timestamp: Date.now()
          });
        });
        responseText = "Finding your location...";
      } else {
        responseText = "Geolocation is not supported in this browser.";
      }
    }

    // 5. Explore Nearby POIs
    else if (intent.action === 'nearby' || intent.action === 'explore') {
      const centerLat = userLocation?.lat || 20.5937;
      const centerLon = userLocation?.lon || 78.9629;
      const pois = await fetchNearbyPOIs(centerLat, centerLon);
      setNearbyPlaces(pois);
      setIsNearbyOpen(true);
      responseText = `Found ${pois.length} places nearby.`;
    }

    if (responseText) {
      addCommandLog(responseText, 'system');
      setVoiceStatus('response');
      setFeedback(responseText, 5000);
      speak(responseText);
    } else {
      const fallback = "Command processed.";
      addCommandLog(fallback, 'system');
      setVoiceStatus('response');
      setFeedback(fallback, 3000);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (voiceStatus === 'listening') {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setVoiceStatus('idle');
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
        // If already started, abort and retry
        try {
          recognitionRef.current.abort();
          setTimeout(() => recognitionRef.current.start(), 100);
        } catch (err) {
          // ignore
        }
      }
    }
  };

  return {
    isListening: voiceStatus === 'listening',
    voiceStatus,
    voiceMessage,
    transcript,
    toggleListening,
    processManualCommand: processCommand
  };
};
