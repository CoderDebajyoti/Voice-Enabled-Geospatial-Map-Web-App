import { useState, useEffect, useRef } from 'react';
import { useMapState } from '../context/MapStateContext';
import { parseVoiceCommand } from '../services/aiParser';
import { geocode } from '../services/geocoder';

export const useSpeech = () => {
  const { language, addCommandLog, setMapMode, setTargetLocation } = useMapState();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Set language from context
    recognition.lang = language;
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onend = async () => {
      setIsListening(false);
      
      // Get the final transcript value
      const finalTranscript = recognitionRef.current.finalTranscriptStr;
      if (finalTranscript && finalTranscript.trim().length > 0) {
        addCommandLog(finalTranscript, 'user');
        await processCommand(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
         addCommandLog(`Error: ${event.error}`, 'system');
      }
    };

    recognitionRef.current = recognition;
    
  }, [language]); // Re-initialize if language changes

  // Helper to keep track of the final transcript since state might not update fast enough inside onend
  useEffect(() => {
    if (recognitionRef.current) {
        recognitionRef.current.finalTranscriptStr = transcript;
    }
  }, [transcript]);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  };

  const processCommand = async (text) => {
    addCommandLog('Analyzing command...', 'system');
    const intent = await parseVoiceCommand(text);
    
    if (intent.action === 'error') {
      addCommandLog(intent.message, 'system');
      speak("I encountered an error.");
      return;
    }

    let responseText = '';

    // Handle view map mode switches
    if (intent.action === 'switch_view' || intent.view_mode) {
      if (intent.view_mode === '2D') {
        setMapMode('2D');
        responseText = 'Switching to 2D map.';
      } else if (intent.view_mode === '3D') {
        setMapMode('3D');
        responseText = 'Switching to 3D globe.';
      }
    }

    // Handle navigation
    if (intent.action === 'navigate' && intent.location) {
      addCommandLog(`Searching coordinates for ${intent.location}...`, 'system');
      const coords = await geocode(intent.location);
      if (coords) {
        setTargetLocation({
           lon: coords.lon,
           lat: coords.lat,
           zoom: intent.zoom === 'in' ? 14 : intent.zoom === 'out' ? 5 : 10,
           timestamp: Date.now()
        });
        
        // Multi-lingual response building logic
        if (language === 'hi-IN') responseText = `${intent.location} की ओर जा रहे हैं।`;
        else if (language === 'bn-IN') responseText = `${intent.location} এ যাচ্ছি।`;
        else responseText = `Navigating to ${intent.location}.`;
        
      } else {
        responseText = `Could not find location ${intent.location}.`;
      }
    }

    // Handle Zoom
    if (intent.action === 'zoom' && intent.zoom) {
       // Just update target targetLocation with a relative zoom if possible, 
       // or issue a general zoom event. To keep it simple, we just pass the zoom command
       setTargetLocation({ zoomOnly: intent.zoom, timestamp: Date.now() });
       responseText = `Zooming ${intent.zoom}.`;
    }
    
    // Handle locate_me
    if (intent.action === 'locate_me') {
       if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition((pos) => {
           setTargetLocation({
              lon: pos.coords.longitude,
              lat: pos.coords.latitude,
              zoom: 14,
              timestamp: Date.now()
           });
         });
         responseText = "Finding your location.";
       } else {
         responseText = "Geolocation is not supported.";
       }
    }

    if (responseText) {
      addCommandLog(responseText, 'system');
      speak(responseText);
    } else if (intent.action !== 'switch_view') {
      addCommandLog(`I understood: ${JSON.stringify(intent)} but couldn't execute it.`, 'system');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return {
    isListening,
    transcript,
    toggleListening
  };
};
