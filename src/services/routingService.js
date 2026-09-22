/**
 * Routing Service using OSRM (Open Source Routing Machine)
 * Free, public, turn-by-turn routing with geometry polyline, distance and duration.
 */

export const calculateRoute = async (startCoords, endCoords, mode = 'driving') => {
  try {
    const { lon: startLon, lat: startLat } = startCoords;
    const { lon: endLon, lat: endLat } = endCoords;

    const url = `https://router.project-osrm.org/route/v1/${mode}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn('OSRM routing request failed:', res.statusText);
      return null;
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const primaryRoute = data.routes[0];
    const distanceKm = (primaryRoute.distance / 1000).toFixed(1);
    const durationMin = Math.round(primaryRoute.duration / 60);

    // Format human-readable ETA
    let durationFormatted = `${durationMin} mins`;
    if (durationMin >= 60) {
      const hours = Math.floor(durationMin / 60);
      const remainingMins = durationMin % 60;
      durationFormatted = `${hours} hr ${remainingMins > 0 ? `${remainingMins} min` : ''}`;
    }

    return {
      coordinates: primaryRoute.geometry.coordinates, // array of [lon, lat]
      distanceKm: parseFloat(distanceKm),
      durationMinutes: durationMin,
      durationFormatted,
      summary: primaryRoute.legs?.[0]?.summary || '',
      steps: (primaryRoute.legs?.[0]?.steps || []).map((s) => ({
        instruction: s.maneuver?.instruction || s.name || 'Proceed',
        distance: Math.round(s.distance)
      }))
    };
  } catch (err) {
    console.warn('Error calculating route:', err);
    return null;
  }
};
