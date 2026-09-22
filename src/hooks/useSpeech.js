import { useState, useEffect, useRef, useCallback } from 'react';
import { useMapState } from '../context/MapStateContext';
import { parseVoiceCommand } from '../services/aiParser';
import { detectLanguage, CATEGORIES } from '../services/multilingualEngine';
import { geocode } from '../services/geocoder';
import { fetchNearbyPOIs, reverseGeocode, isPOIMatchingCategory } from '../services/nearbyService';
import { calculateRoute } from '../services/routingService';

export const useSpeech = () => {
  const {
    language,
    setLanguage,
    detectedLanguage,
    setDetectedLanguage,
    addCommandLog,
    setMapMode,
    setMapLayer,
    setTargetLocation,
    userLocation,
    setUserLocation,
    nearbyPlaces,
    setNearbyPlaces,
    selectedPlace,
    setSelectedPlace,
    setIsNearbyOpen,
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
  } = useMapState();

  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Helper to set temporary feedback message
  const setFeedback = useCallback(
    (msg, status = 'response', duration = 5000) => {
      setVoiceMessage(msg);
      setVoiceStatus(status);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVoiceMessage('');
        setVoiceStatus('idle');
      }, duration);
    },
    [setVoiceMessage, setVoiceStatus]
  );

  // Spoken feedback in matching language
  const speak = useCallback(
    (text, langCode = 'en') => {
      if (!window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        if (langCode === 'bn' || langCode === 'bn-en') {
          utterance.lang = 'bn-IN';
        } else if (langCode === 'hi' || langCode === 'hi-en') {
          utterance.lang = 'hi-IN';
        } else {
          utterance.lang = 'en-US';
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    },
    []
  );

  // Initialize Speech Recognition with adaptive language
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    if (language === 'auto') {
      recognition.lang = navigator.language || 'en-US';
    } else {
      recognition.lang = language;
    }

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

      // Real-time language detection on interim transcript
      if (combined.trim().length > 2) {
        const langInfo = detectLanguage(combined);
        setDetectedLanguage(langInfo);
      }

      if (finalTranscript) {
        recognitionRef.current.finalTranscriptStr = finalTranscript;
      }
    };

    recognition.onend = async () => {
      const finalTranscript = recognitionRef.current.finalTranscriptStr || transcript;
      if (finalTranscript && finalTranscript.trim().length > 0) {
        setVoiceStatus('processing');
        const langInfo = detectLanguage(finalTranscript);
        setDetectedLanguage(langInfo);

        addCommandLog(finalTranscript, 'user', { lang: langInfo.label });
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
        setFeedback(`Voice error: ${event.error}`, 'idle');
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
  }, [language, addCommandLog, setVoiceStatus, setFeedback, setDetectedLanguage]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.finalTranscriptStr = transcript;
    }
  }, [transcript]);

  // Main Command Processing Pipeline
  const processCommand = async (text) => {
    setVoiceStatus('processing');
    setVoiceMessage('Understanding...');

    const cleanLower = text.toLowerCase().trim();

    // Affirmative confirmation check
    const affirmativeWords = [
      'yes', 'yeah', 'yep', 'sure', 'correct', 'ok', 'okay',
      'হ্যাঁ', 'হ্যা', 'হাঁ', 'ঠিক আছে', 'করো',
      'हाँ', 'हां', 'सही है', 'ठीक है', 'करो'
    ];
    const isAffirmative = affirmativeWords.some((w) => cleanLower === w || cleanLower.startsWith(w));

    if (pendingClarification && isAffirmative) {
      const intentToExecute = pendingClarification;
      setPendingClarification(null);
      await executeIntent(intentToExecute);
      return;
    }

    // Parse with Multilingual & Semantic Engine
    const parsed = await parseVoiceCommand(text, lastVoiceIntent);

    // If clarification needed, prompt politely
    if (parsed.needs_clarification && parsed.clarification_question) {
      setPendingClarification(parsed);
      setVoiceStatus('clarifying');
      setVoiceMessage(parsed.clarification_question);
      addCommandLog(parsed.clarification_question, 'system');
      speak(parsed.clarification_question, parsed.language);
      return;
    }

    await executeIntent(parsed);
  };

  // Dispatch Geospatial Action from Structured Intent
  const executeIntent = async (parsed) => {
    const { intent, category, location, language: detectedLang, context_reference, targetIndex, target_selection } = parsed;
    let responseText = '';

    const centerLat = userLocation?.lat || 20.5937;
    const centerLon = userLocation?.lon || 78.9629;
    const startCoords = userLocation
      ? { lon: userLocation.lon, lat: userLocation.lat }
      : { lon: centerLon, lat: centerLat };

    // 1. NAVIGATE_TO (e.g. "Take me to the nearest coffee shop", "কাছের কফি শপে নিয়ে চলো", "मेरे पास सबसे नज़दीकी कैफे पर ले चलो")
    if (intent === 'NAVIGATE_TO') {
      if (category === 'HOME' || location === 'HOME') {
        const dest = homeLocation || userLocation;
        if (dest) {
          setTargetLocation({
            lon: dest.lon,
            lat: dest.lat,
            zoom: 16,
            label: 'Home',
            timestamp: Date.now()
          });
          if (detectedLang === 'bn' || detectedLang === 'bn-en') {
            responseText = 'বাড়ি যাওয়ার দিক নির্দেশ করা হলো।';
          } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
            responseText = 'घर की ओर नेविगेट किया जा रहा है।';
          } else {
            responseText = 'Navigating towards home.';
          }
        } else {
          responseText = 'Home location set to current location.';
          if (userLocation) setHomeLocation(userLocation);
        }
      } else if (category) {
        // Semantic Category Navigation (e.g. "Take me to the nearest coffee shop", "take me to a cafe")
        const catKey = category;
        const catDef = CATEGORIES[catKey] || CATEGORIES.CAFE;

        addCommandLog(`Searching nearby ${catDef.label.toLowerCase()}...`, 'system');
        const pois = await fetchNearbyPOIs(centerLat, centerLon, catKey.toLowerCase());

        // Match POIs strictly by semantic category/type/tags — NOT requiring place name to have category word
        const matchingPOIs = pois.filter((p) => isPOIMatchingCategory(p, catKey));
        const candidatePOIs = matchingPOIs.length > 0 ? matchingPOIs : pois;

        if (candidatePOIs.length > 0) {
          // Sort by distance to find the nearest matching place
          const sorted = [...candidatePOIs].sort((a, b) => (a.distance || 0) - (b.distance || 0));
          const nearestPlace = sorted[0];

          setSelectedPlace(nearestPlace);
          setNearbyPlaces(candidatePOIs);
          setActiveCategory(catKey.toLowerCase());
          setIsNearbyOpen(true);

          const destCoords = { lon: nearestPlace.lon, lat: nearestPlace.lat };
          addCommandLog(`Routing to nearest: ${nearestPlace.name}...`, 'system');

          const routeData = await calculateRoute(startCoords, destCoords);
          if (routeData) {
            setActiveRoute({
              ...routeData,
              destinationName: nearestPlace.name,
              destinationCoords: destCoords,
              timestamp: Date.now()
            });

            setTargetLocation({
              lon: (startCoords.lon + destCoords.lon) / 2,
              lat: (startCoords.lat + destCoords.lat) / 2,
              zoom: 14,
              timestamp: Date.now()
            });

            const distKm = routeData.distanceKm;
            const eta = routeData.durationFormatted;

            if (detectedLang === 'bn' || detectedLang === 'bn-en') {
              responseText = `সবচেয়ে কাছের ${catDef.label} ${nearestPlace.name}-এ নিয়ে যাচ্ছি (${distKm} কিমি, প্রায় ${eta})।`;
            } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
              responseText = `सबसे नजदीकी ${catDef.label} ${nearestPlace.name} के लिए नेविगेट किया जा रहा है (${distKm} किमी, लगभग ${eta})।`;
            } else {
              responseText = `Navigating to nearest ${catDef.label}: ${nearestPlace.name} (${distKm} km, ~${eta}).`;
            }
          } else {
            setTargetLocation({
              lon: nearestPlace.lon,
              lat: nearestPlace.lat,
              zoom: 16,
              label: nearestPlace.name,
              timestamp: Date.now()
            });
            responseText = `Found nearest ${catDef.label}: ${nearestPlace.name}.`;
          }

          setLastVoiceIntent({
            intent: 'NAVIGATE_TO',
            category: catKey,
            pois: candidatePOIs,
            selectedPlace: nearestPlace,
            timestamp: Date.now()
          });
        } else {
          responseText = `Could not find any ${catDef.label} nearby.`;
        }
      } else if (location && location !== 'CURRENT_LOCATION') {
        // Navigation to a named city/landmark (e.g. "Go to Paris")
        addCommandLog(`Locating ${location}...`, 'system');
        const coords = await geocode(location);
        if (coords) {
          const destCoords = { lon: coords.lon, lat: coords.lat };
          const routeData = await calculateRoute(startCoords, destCoords);

          if (routeData) {
            setActiveRoute({
              ...routeData,
              destinationName: coords.displayName?.split(',')[0] || location,
              destinationCoords: destCoords,
              timestamp: Date.now()
            });
            setTargetLocation({
              lon: (startCoords.lon + destCoords.lon) / 2,
              lat: (startCoords.lat + destCoords.lat) / 2,
              zoom: 12,
              timestamp: Date.now()
            });
          } else {
            setTargetLocation({
              lon: coords.lon,
              lat: coords.lat,
              zoom: 15,
              label: coords.displayName?.split(',')[0] || location,
              timestamp: Date.now()
            });
          }
          responseText = `Navigating to ${location}.`;
        } else {
          responseText = `Could not find "${location}".`;
        }
      }
    }

    // 2. FIND_NEARBY (e.g. "coffee shop near me", "show hospitals near me")
    else if (intent === 'FIND_NEARBY') {
      const catKey = category || 'HOSPITAL';
      const catDef = CATEGORIES[catKey] || CATEGORIES.HOSPITAL;

      // Handle Contextual Query: "Which one is closest?"
      if (context_reference === 'closest' && nearbyPlaces.length > 0) {
        const closestPlace = [...nearbyPlaces].sort((a, b) => (a.distance || 0) - (b.distance || 0))[0];
        setSelectedPlace(closestPlace);
        setTargetLocation({
          lon: closestPlace.lon,
          lat: closestPlace.lat,
          zoom: 16,
          label: closestPlace.name,
          timestamp: Date.now()
        });

        const distStr = closestPlace.distance < 1
          ? `${Math.round(closestPlace.distance * 1000)} meters`
          : `${closestPlace.distance} km`;

        if (detectedLang === 'bn' || detectedLang === 'bn-en') {
          responseText = `সবচেয়ে কাছের স্থান হলো ${closestPlace.name}, এটি ${distStr} দূরে।`;
        } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
          responseText = `सबसे नजदीकी स्थान ${closestPlace.name} है, जो ${distStr} दूर है।`;
        } else {
          responseText = `The closest one is ${closestPlace.name}, located ${distStr} away.`;
        }
      } else {
        // Fetch nearby POIs around user location
        const pois = await fetchNearbyPOIs(centerLat, centerLon, catKey.toLowerCase());
        const matchingPOIs = pois.filter((p) => isPOIMatchingCategory(p, catKey));
        const finalPOIs = matchingPOIs.length > 0 ? matchingPOIs : pois;

        setNearbyPlaces(finalPOIs);
        setActiveCategory(catKey.toLowerCase());
        setIsNearbyOpen(true);

        if (finalPOIs && finalPOIs.length > 0) {
          const firstPoi = finalPOIs[0];
          setSelectedPlace(firstPoi);
          setTargetLocation({
            lon: firstPoi.lon,
            lat: firstPoi.lat,
            zoom: 15,
            label: firstPoi.name,
            timestamp: Date.now()
          });

          if (detectedLang === 'bn' || detectedLang === 'bn-en') {
            responseText = `আপনার কাছাকাছি ${finalPOIs.length}টি ${catDef.label} পাওয়া গেছে।`;
          } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
            responseText = `आपके पास ${finalPOIs.length} ${catDef.label} मिले हैं।`;
          } else {
            responseText = `Found ${finalPOIs.length} ${catDef.label} locations near you.`;
          }
        } else {
          responseText = `No ${catDef.label} found right nearby.`;
        }

        setLastVoiceIntent({
          intent: 'FIND_NEARBY',
          category: catKey,
          pois: finalPOIs,
          timestamp: Date.now()
        });
      }
    }

    // 3. FIND_ROUTE (Direct routing request)
    else if (intent === 'FIND_ROUTE') {
      let destCoords = null;
      let destName = '';

      if (context_reference === 'selected_or_first') {
        const p = selectedPlace || nearbyPlaces[0];
        if (p) {
          destCoords = { lon: p.lon, lat: p.lat };
          destName = p.name;
        }
      } else if (category) {
        const pois = await fetchNearbyPOIs(centerLat, centerLon, category.toLowerCase());
        const matching = pois.filter((p) => isPOIMatchingCategory(p, category));
        const target = matching[0] || pois[0];
        if (target) {
          destCoords = { lon: target.lon, lat: target.lat };
          destName = target.name;
          setSelectedPlace(target);
          setNearbyPlaces(matching.length > 0 ? matching : pois);
        }
      } else if (location && location !== 'CURRENT_LOCATION') {
        const coords = await geocode(location);
        if (coords) {
          destCoords = { lon: coords.lon, lat: coords.lat };
          destName = location;
        }
      }

      if (destCoords) {
        addCommandLog(`Calculating route to ${destName}...`, 'system');
        const routeData = await calculateRoute(startCoords, destCoords);
        if (routeData) {
          setActiveRoute({
            ...routeData,
            destinationName: destName,
            destinationCoords: destCoords,
            timestamp: Date.now()
          });

          setTargetLocation({
            lon: (startCoords.lon + destCoords.lon) / 2,
            lat: (startCoords.lat + destCoords.lat) / 2,
            zoom: 13,
            timestamp: Date.now()
          });

          if (detectedLang === 'bn' || detectedLang === 'bn-en') {
            responseText = `${destName}-এ পৌঁছাতে প্রায় ${routeData.durationFormatted} লাগবে (${routeData.distanceKm} কিমি)।`;
          } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
            responseText = `${destName} का रास्ता: दूरी ${routeData.distanceKm} किमी, लगभग ${routeData.durationFormatted} लगेंगे।`;
          } else {
            responseText = `Route to ${destName} found: ${routeData.distanceKm} km, approx ${routeData.durationFormatted}.`;
          }
        } else {
          responseText = `Could not calculate route to ${destName}.`;
        }
      } else {
        responseText = `Please specify a destination to find route.`;
      }
    }

    // 4. GET_LOCATION_INFORMATION (e.g., "How far is the first one?")
    else if (intent === 'GET_LOCATION_INFORMATION') {
      const idx = targetIndex ?? 0;
      const targetPlace = nearbyPlaces[idx] || selectedPlace;

      if (targetPlace) {
        setSelectedPlace(targetPlace);
        setTargetLocation({
          lon: targetPlace.lon,
          lat: targetPlace.lat,
          zoom: 16,
          label: targetPlace.name,
          timestamp: Date.now()
        });

        const distStr = targetPlace.distance < 1
          ? `${Math.round(targetPlace.distance * 1000)} meters`
          : `${targetPlace.distance} km`;

        if (detectedLang === 'bn' || detectedLang === 'bn-en') {
          responseText = `${targetPlace.name} আপনার থেকে ${distStr} দূরে।`;
        } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
          responseText = `${targetPlace.name} आपसे ${distStr} दूर है।`;
        } else {
          responseText = `${targetPlace.name} is ${distStr} away from your position.`;
        }
      } else {
        responseText = `Please select or search a location first.`;
      }
    }

    // 5. SEARCH_LOCATION / Named Place Search
    else if (intent === 'SEARCH_LOCATION' && location) {
      addCommandLog(`Searching for ${location}...`, 'system');
      const coords = await geocode(location);
      if (coords) {
        setTargetLocation({
          lon: coords.lon,
          lat: coords.lat,
          zoom: 14,
          label: coords.displayName?.split(',')[0] || location,
          timestamp: Date.now()
        });

        try {
          const pois = await fetchNearbyPOIs(coords.lat, coords.lon, 'all');
          if (pois && pois.length > 0) {
            setNearbyPlaces(pois);
            setIsNearbyOpen(true);
          }
        } catch (e) {
          // ignore
        }

        if (detectedLang === 'bn' || detectedLang === 'bn-en') {
          responseText = `${location}-এ যাচ্ছি।`;
        } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
          responseText = `${location} की ओर जा रहे हैं।`;
        } else {
          responseText = `Navigating to ${location}.`;
        }
      } else {
        responseText = `Could not find "${location}".`;
      }
    }

    // 6. SHOW_CURRENT_LOCATION / Locate Me
    else if (intent === 'SHOW_CURRENT_LOCATION') {
      if (userLocation) {
        setTargetLocation({
          lon: userLocation.lon,
          lat: userLocation.lat,
          zoom: 15,
          isUserLocation: true,
          label: userLocation.name,
          timestamp: Date.now()
        });
        if (detectedLang === 'bn' || detectedLang === 'bn-en') {
          responseText = `আপনার বর্তমান অবস্থান: ${userLocation.name}।`;
        } else if (detectedLang === 'hi' || detectedLang === 'hi-en') {
          responseText = `आपकी वर्तमान स्थिति: ${userLocation.name}।`;
        } else {
          responseText = `Centered on your location (${userLocation.name}).`;
        }
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
        responseText = 'Finding your current position...';
      } else {
        responseText = 'Geolocation is not supported in this browser.';
      }
    }

    // 7. CHANGE_MAP_LAYER
    else if (intent === 'CHANGE_MAP_LAYER') {
      if (parsed.layer === '3D') {
        setMapMode('3D');
        responseText = 'Switched to 3D globe view.';
      } else if (parsed.layer === '2D') {
        setMapMode('2D');
        responseText = 'Switched to 2D map view.';
      } else if (parsed.layer === 'satellite') {
        setMapLayer('satellite');
        responseText = 'Switched to satellite layer.';
      }
    }

    // 8. ZOOM_IN / ZOOM_OUT
    else if (intent === 'ZOOM_IN') {
      setTargetLocation({ zoomOnly: 'in', timestamp: Date.now() });
      responseText = 'Zoomed in.';
    } else if (intent === 'ZOOM_OUT') {
      setTargetLocation({ zoomOnly: 'out', timestamp: Date.now() });
      responseText = 'Zoomed out.';
    }

    // 9. CLEAR_MAP
    else if (intent === 'CLEAR_MAP') {
      setActiveRoute(null);
      setIsNearbyOpen(false);
      responseText = 'Map cleared.';
    }

    if (responseText) {
      addCommandLog(responseText, 'system');
      setFeedback(responseText, 'response', 6000);
      speak(responseText, detectedLang);
    } else {
      const fallback = 'Command processed.';
      addCommandLog(fallback, 'system');
      setFeedback(fallback, 'response', 3000);
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
        if (pendingClarification) setPendingClarification(null);
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
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
    detectedLanguage,
    pendingClarification,
    toggleListening,
    processManualCommand: processCommand,
    confirmClarification: () => {
      if (pendingClarification) {
        const intent = pendingClarification;
        setPendingClarification(null);
        executeIntent(intent);
      }
    },
    cancelClarification: () => {
      setPendingClarification(null);
      setVoiceStatus('idle');
      setVoiceMessage('');
    }
  };
};
