import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { useMapState } from '../context/MapStateContext';

const Map2D = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markerSourceRef = useRef(null);
  const { mapMode, targetLocation } = useMapState();

  useEffect(() => {
    // Initialize map
    const vectorSource = new VectorSource();
    markerSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#f43f5e' }), // Rose-500
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      })
    });

    const initialMap = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // Center of India
        zoom: 4
      }),
      controls: [] // Remove default controls since we have custom UI
    });

    mapRef.current = initialMap;

    return () => {
      initialMap.setTarget(null);
    };
  }, []);

  // Effect to handle navigation
  useEffect(() => {
    if (mapRef.current && targetLocation) {
      const view = mapRef.current.getView();
      
      if (targetLocation.zoomOnly) {
         let currentZoom = view.getZoom();
         view.animate({
           zoom: targetLocation.zoomOnly === 'in' ? currentZoom + 2 : currentZoom - 2,
           duration: 1000
         });
         return;
      }

      if (targetLocation.lon !== undefined && targetLocation.lat !== undefined) {
         const coords = fromLonLat([targetLocation.lon, targetLocation.lat]);
         
         // Clear previous markers
         markerSourceRef.current.clear();
         
         // Add new marker
         const marker = new Feature({
            geometry: new Point(coords)
         });
         markerSourceRef.current.addFeature(marker);

         // Animate to location
         view.animate({
           center: coords,
           zoom: targetLocation.zoom || 12,
           duration: 2000
         });
      }
    }
  }, [targetLocation]);

  return (
    <div 
      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
        mapMode === '2D' ? 'opacity-100 pointer-events-auto z-0' : 'opacity-0 pointer-events-none -z-10'
      }`}
    >
      <div ref={mapElement} className="w-full h-full" />
    </div>
  );
};

export default Map2D;
