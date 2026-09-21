import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import CircleGeom from 'ol/geom/Circle';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import { useMapState } from '../context/MapStateContext';

const Map2D = () => {
  const mapElement = useRef(null);
  const popupElement = useRef(null);
  const mapRef = useRef(null);
  
  // Sources
  const baseTileLayerRef = useRef(null);
  const userLocSourceRef = useRef(null);
  const placesSourceRef = useRef(null);
  const searchSourceRef = useRef(null);
  const popupOverlayRef = useRef(null);

  const {
    mapMode,
    mapLayer,
    targetLocation,
    userLocation,
    nearbyPlaces,
    setSelectedPlace,
    setIsNearbyOpen
  } = useMapState();

  // 1. Initialize Map
  useEffect(() => {
    // Tile sources for different layers
    const getTileSource = (layerType) => {
      if (layerType === 'satellite') {
        return new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maxZoom: 19,
          attributions: 'Tiles © Esri'
        });
      }
      if (layerType === 'light') {
        return new XYZ({
          url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          maxZoom: 19,
          attributions: '© OpenStreetMap, © CARTO'
        });
      }
      // default: OSM
      return new OSM();
    };

    const baseLayer = new TileLayer({
      source: getTileSource(mapLayer)
    });
    baseTileLayerRef.current = baseLayer;

    // Source & Layer for User Location (Google Maps style pulsating blue dot)
    const userLocSource = new VectorSource();
    userLocSourceRef.current = userLocSource;

    const userLocLayer = new VectorLayer({
      source: userLocSource,
      zIndex: 100,
      style: (feature) => {
        const isAccuracyRing = feature.get('isAccuracyRing');
        if (isAccuracyRing) {
          return new Style({
            fill: new Fill({ color: 'rgba(59, 130, 246, 0.12)' }),
            stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.35)', width: 1.5 })
          });
        }
        // Google Maps blue dot indicator: Blue solid with white stroke and subtle outer aura
        return [
          // Outer halo ring
          new Style({
            image: new CircleStyle({
              radius: 13,
              fill: new Fill({ color: 'rgba(37, 99, 235, 0.25)' }),
              stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.6)', width: 1 })
            })
          }),
          // Main Blue core
          new Style({
            image: new CircleStyle({
              radius: 7,
              fill: new Fill({ color: '#2563eb' }), // Primary royal blue
              stroke: new Stroke({ color: '#ffffff', width: 2.5 })
            })
          })
        ];
      }
    });

    // Source & Layer for Nearby POIs
    const placesSource = new VectorSource();
    placesSourceRef.current = placesSource;

    const placesLayer = new VectorLayer({
      source: placesSource,
      zIndex: 80,
      style: (feature) => {
        const cat = feature.get('category') || 'landmark';
        const name = feature.get('name') || '';
        let color = '#475569'; // slate-600
        if (cat === 'food') color = '#d97706'; // amber-600
        else if (cat === 'transit') color = '#4f46e5'; // indigo-600
        else if (cat === 'parks') color = '#059669'; // emerald-600

        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#ffffff', width: 2 })
          }),
          text: new Text({
            text: name.length > 20 ? `${name.substring(0, 18)}…` : name,
            font: '500 11px Inter, system-ui, sans-serif',
            offsetY: -14,
            fill: new Fill({ color: '#1e293b' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
            backgroundFill: new Fill({ color: 'rgba(255,255,255,0.85)' }),
            padding: [2, 4, 2, 4]
          })
        });
      }
    });

    // Source & Layer for Search Target Pin
    const searchSource = new VectorSource();
    searchSourceRef.current = searchSource;

    const searchLayer = new VectorLayer({
      source: searchSource,
      zIndex: 90,
      style: (feature) => {
        const label = feature.get('label') || '';
        return [
          new Style({
            image: new CircleStyle({
              radius: 9,
              fill: new Fill({ color: '#ef4444' }), // Red-500
              stroke: new Stroke({ color: '#ffffff', width: 2.5 })
            }),
            text: label
              ? new Text({
                  text: label,
                  font: '600 12px Inter, system-ui, sans-serif',
                  offsetY: -16,
                  fill: new Fill({ color: '#0f172a' }),
                  stroke: new Stroke({ color: '#ffffff', width: 3 }),
                  backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
                  padding: [3, 6, 3, 6]
                })
              : undefined
          })
        ];
      }
    });

    // Popup overlay for clicking markers
    const popupOverlay = new Overlay({
      element: popupElement.current,
      autoPan: {
        animation: {
          duration: 250
        }
      },
      positioning: 'bottom-center',
      offset: [0, -12]
    });
    popupOverlayRef.current = popupOverlay;

    const map = new Map({
      target: mapElement.current,
      layers: [baseLayer, placesLayer, searchLayer, userLocLayer],
      overlays: [popupOverlay],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]), // Center of India default
        zoom: 4,
        maxZoom: 19,
        minZoom: 2
      }),
      controls: []
    });

    // Pointer cursor on hover over markers
    map.on('pointermove', (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: (layer) => layer === placesLayer || layer === searchLayer
      });
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    // Click on markers
    map.on('singleclick', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature && !feature.get('isAccuracyRing') && !feature.get('isUserLoc')) {
        const placeData = feature.get('placeData');
        if (placeData) {
          setSelectedPlace(placeData);
          setIsNearbyOpen(true);
        }
      }
    });

    mapRef.current = map;

    return () => {
      map.setTarget(null);
    };
  }, []);

  // 2. Handle Layer Type Change
  useEffect(() => {
    if (baseTileLayerRef.current) {
      if (mapLayer === 'satellite') {
        baseTileLayerRef.current.setSource(
          new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
            attributions: 'Tiles © Esri'
          })
        );
      } else if (mapLayer === 'light') {
        baseTileLayerRef.current.setSource(
          new XYZ({
            url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            maxZoom: 19,
            attributions: '© OpenStreetMap, © CARTO'
          })
        );
      } else {
        baseTileLayerRef.current.setSource(new OSM());
      }
    }
  }, [mapLayer]);

  // 3. Update User Location Marker (Google Maps style)
  useEffect(() => {
    if (userLocSourceRef.current && userLocation) {
      userLocSourceRef.current.clear();

      const userCoords = fromLonLat([userLocation.lon, userLocation.lat]);

      // Accuracy ring (radius in meters approximated)
      if (userLocation.accuracy && userLocation.accuracy > 10) {
        const accuracyCircle = new Feature({
          geometry: new CircleGeom(userCoords, userLocation.accuracy),
          isAccuracyRing: true
        });
        userLocSourceRef.current.addFeature(accuracyCircle);
      }

      // Core blue dot
      const userDot = new Feature({
        geometry: new Point(userCoords),
        isUserLoc: true,
        name: userLocation.name || 'You are here'
      });
      userLocSourceRef.current.addFeature(userDot);
    }
  }, [userLocation]);

  // 4. Update Nearby Places Markers
  useEffect(() => {
    if (placesSourceRef.current) {
      placesSourceRef.current.clear();
      if (nearbyPlaces && nearbyPlaces.length > 0) {
        const features = nearbyPlaces.map((place) => {
          const feat = new Feature({
            geometry: new Point(fromLonLat([place.lon, place.lat])),
            name: place.name,
            category: place.category,
            placeData: place
          });
          return feat;
        });
        placesSourceRef.current.addFeatures(features);
      }
    }
  }, [nearbyPlaces]);

  // 5. Handle Target Navigation / Recenter / Zoom
  useEffect(() => {
    if (mapRef.current && targetLocation) {
      const view = mapRef.current.getView();

      if (targetLocation.zoomOnly) {
        const currentZoom = view.getZoom();
        view.animate({
          zoom: targetLocation.zoomOnly === 'in' ? currentZoom + 1.5 : Math.max(2, currentZoom - 1.5),
          duration: 400
        });
        return;
      }

      if (targetLocation.lon !== undefined && targetLocation.lat !== undefined) {
        const coords = fromLonLat([targetLocation.lon, targetLocation.lat]);

        // Update Search Marker (only if not user location)
        if (searchSourceRef.current) {
          searchSourceRef.current.clear();
          if (!targetLocation.isUserLocation) {
            const marker = new Feature({
              geometry: new Point(coords),
              label: targetLocation.label || ''
            });
            searchSourceRef.current.addFeature(marker);
          }
        }

        // Animate view smoothly to location
        view.animate({
          center: coords,
          zoom: targetLocation.zoom || 14,
          duration: 1200
        });
      }
    }
  }, [targetLocation]);

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
        mapMode === '2D' ? 'opacity-100 pointer-events-auto z-0' : 'opacity-0 pointer-events-none -z-10'
      }`}
    >
      <div ref={mapElement} className="w-full h-full" />
      {/* Hidden popup container for overlay */}
      <div ref={popupElement} className="hidden" />
    </div>
  );
};

export default Map2D;
