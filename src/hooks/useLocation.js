import { useEffect, useCallback } from 'react';
import { useMapState } from '../context/MapStateContext';
import { reverseGeocode, fetchNearbyPOIs } from '../services/nearbyService';

export const useLocation = () => {
  const {
    userLocation,
    setUserLocation,
    locationPermission,
    setLocationPermission,
    setLocationError,
    setTargetLocation,
    setNearbyPlaces,
    setIsNearbyOpen,
    addCommandLog
  } = useMapState();

  const requestUserLocation = useCallback((autoCenter = true, triggerNearby = true) => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      setLocationError('Geolocation is not supported by your browser.');
      addCommandLog('Geolocation is not supported by your browser.', 'system');
      return;
    }

    setLocationPermission('loading');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationPermission('granted');

        // Reverse geocode to get human-readable location name
        const geoInfo = await reverseGeocode(latitude, longitude);
        const locationName = geoInfo?.name || 'Current Location';
        const cityName = geoInfo?.city || '';

        const locData = {
          lat: latitude,
          lon: longitude,
          accuracy: Math.round(accuracy),
          name: locationName,
          city: cityName,
          fullAddress: geoInfo?.fullAddress || ''
        };

        setUserLocation(locData);

        if (autoCenter) {
          setTargetLocation({
            lon: longitude,
            lat: latitude,
            zoom: 14,
            isUserLocation: true,
            label: locationName,
            timestamp: Date.now()
          });
          addCommandLog(`Located at: ${locationName}${cityName ? `, ${cityName}` : ''}`, 'system');
        }

        // Fetch nearby POIs around user
        if (triggerNearby) {
          try {
            const pois = await fetchNearbyPOIs(latitude, longitude);
            if (pois && pois.length > 0) {
              setNearbyPlaces(pois);
              setIsNearbyOpen(true);
            }
          } catch (e) {
            console.warn('Nearby fetch failed:', e);
          }
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (err.code === 1) {
          setLocationPermission('denied');
          setLocationError('Location permission was denied. You can enable it in browser settings.');
          addCommandLog('Location permission denied.', 'system');
        } else if (err.code === 2) {
          setLocationPermission('error');
          setLocationError('Location position is unavailable.');
          addCommandLog('Location unavailable.', 'system');
        } else {
          setLocationPermission('error');
          setLocationError('Location request timed out.');
          addCommandLog('Location request timed out.', 'system');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [setUserLocation, setLocationPermission, setLocationError, setTargetLocation, setNearbyPlaces, setIsNearbyOpen, addCommandLog]);

  // Recenter map on user location if already detected, or request if not
  const recenterUserLocation = useCallback(() => {
    if (userLocation) {
      setTargetLocation({
        lon: userLocation.lon,
        lat: userLocation.lat,
        zoom: 15,
        isUserLocation: true,
        label: userLocation.name,
        timestamp: Date.now()
      });
      addCommandLog(`Recentered to your location (${userLocation.name})`, 'system');
    } else {
      requestUserLocation(true, true);
    }
  }, [userLocation, setTargetLocation, requestUserLocation, addCommandLog]);

  // Auto-request location on initial mount
  useEffect(() => {
    if (locationPermission === 'idle') {
      requestUserLocation(true, true);
    }
  }, [locationPermission, requestUserLocation]);

  return {
    userLocation,
    locationPermission,
    requestUserLocation,
    recenterUserLocation
  };
};
