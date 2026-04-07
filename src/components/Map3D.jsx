import React, { useEffect, useRef } from 'react';
import { Viewer, Cartesian3, Math as CesiumMath, Color, Entity } from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useMapState } from '../context/MapStateContext';

const Map3D = () => {
  const viewerRef = useRef(null);
  const cesiumViewer = useRef(null);
  const entityRef = useRef(null);
  const { mapMode, targetLocation } = useMapState();

  useEffect(() => {
    // Initialize Cesium Viewer
    const viewer = new Viewer(viewerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      vrButton: false,
      selectionIndicator: false,
      // Minimal setup to work perfectly without requiring an Ion token immediately
    });

    // Hide default Cesium logo for standard UI look
    viewer.cesiumWidget.creditContainer.style.display = "none";

    // Set initial camera view to India
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(78.9629, 20.5937, 5000000.0),
      duration: 0
    });

    cesiumViewer.current = viewer;

    return () => {
      viewer.destroy();
    };
  }, []);

  // Handle map state changes
  useEffect(() => {
    if (cesiumViewer.current && targetLocation) {
      if (targetLocation.zoomOnly) {
         const camera = cesiumViewer.current.camera;
         const currentHeight = camera.positionCartographic.height;
         const targetHeight = targetLocation.zoomOnly === 'in' ? currentHeight / 2 : currentHeight * 2;
         
         camera.flyTo({
           destination: Cartesian3.fromRadians(
             camera.positionCartographic.longitude,
             camera.positionCartographic.latitude,
             targetHeight
           ),
           duration: 1.0
         });
         return;
      }

      if (targetLocation.lon !== undefined && targetLocation.lat !== undefined) {
         // Create or update marker (Entity)
         if (entityRef.current) {
             cesiumViewer.current.entities.remove(entityRef.current);
         }
         
         entityRef.current = cesiumViewer.current.entities.add({
             position: Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat),
             point: {
                 pixelSize: 15,
                 color: Color.fromCssColorString('#f43f5e'),
                 outlineColor: Color.WHITE,
                 outlineWidth: 2
             }
         });

         // Calculate altitude based on zoom proxy
         const altitude = targetLocation.zoom ? Math.max(1000, 10000000 / targetLocation.zoom) : 10000;

         cesiumViewer.current.camera.flyTo({
             destination: Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat, altitude),
             orientation: {
                 heading: CesiumMath.toRadians(0.0),
                 pitch: CesiumMath.toRadians(-90.0),
                 roll: 0.0
             },
             duration: 2.0
         });
      }
    }
  }, [targetLocation]);

  return (
    <div 
      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
        mapMode === '3D' ? 'opacity-100 pointer-events-auto z-0' : 'opacity-0 pointer-events-none -z-10'
      }`}
    >
      <div ref={viewerRef} className="w-full h-full" />
    </div>
  );
};

export default Map3D;
