import React, { useEffect, useRef } from 'react';
import { Viewer, Cartesian3, Math as CesiumMath, Color, Entity } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useMapState } from '../context/MapStateContext';

const Map3D = () => {
  const viewerRef = useRef(null);
  const cesiumViewer = useRef(null);
  const targetEntityRef = useRef(null);
  const userEntityRef = useRef(null);
  const routeEntityRef = useRef(null);

  const { mapMode, targetLocation, userLocation, activeRoute } = useMapState();

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
      selectionIndicator: false
    });

    // Hide default Cesium logo for clean UI
    if (viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
      viewer.cesiumWidget.creditContainer.style.display = 'none';
    }

    // Set initial camera view
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(78.9629, 20.5937, 8000000.0),
      duration: 0
    });

    cesiumViewer.current = viewer;

    return () => {
      viewer.destroy();
    };
  }, []);

  // Update User Location Entity in 3D
  useEffect(() => {
    if (cesiumViewer.current && userLocation) {
      if (userEntityRef.current) {
        cesiumViewer.current.entities.remove(userEntityRef.current);
      }

      userEntityRef.current = cesiumViewer.current.entities.add({
        position: Cartesian3.fromDegrees(userLocation.lon, userLocation.lat),
        point: {
          pixelSize: 14,
          color: Color.fromCssColorString('#2563eb'),
          outlineColor: Color.WHITE,
          outlineWidth: 3
        }
      });
    }
  }, [userLocation]);

  // Update Route Polyline in 3D
  useEffect(() => {
    if (cesiumViewer.current) {
      if (routeEntityRef.current) {
        cesiumViewer.current.entities.remove(routeEntityRef.current);
        routeEntityRef.current = null;
      }

      if (activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 1) {
        const flatCoords = activeRoute.coordinates.flat();
        routeEntityRef.current = cesiumViewer.current.entities.add({
          polyline: {
            positions: Cartesian3.fromDegreesArray(flatCoords),
            width: 4.5,
            material: Color.fromCssColorString('#2563eb'),
            clampToGround: true
          }
        });
      }
    }
  }, [activeRoute]);

  // Handle Target Navigation & Zoom in 3D
  useEffect(() => {
    if (cesiumViewer.current && targetLocation) {
      if (targetLocation.zoomOnly) {
        const camera = cesiumViewer.current.camera;
        const currentHeight = camera.positionCartographic.height;
        const targetHeight =
          targetLocation.zoomOnly === 'in' ? Math.max(500, currentHeight * 0.5) : currentHeight * 2;

        camera.flyTo({
          destination: Cartesian3.fromRadians(
            camera.positionCartographic.longitude,
            camera.positionCartographic.latitude,
            targetHeight
          ),
          duration: 0.8
        });
        return;
      }

      if (targetLocation.lon !== undefined && targetLocation.lat !== undefined) {
        // Target Marker (if not user location)
        if (targetEntityRef.current) {
          cesiumViewer.current.entities.remove(targetEntityRef.current);
        }

        if (!targetLocation.isUserLocation) {
          targetEntityRef.current = cesiumViewer.current.entities.add({
            position: Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat),
            point: {
              pixelSize: 14,
              color: Color.fromCssColorString('#ef4444'),
              outlineColor: Color.WHITE,
              outlineWidth: 2
            }
          });
        }

        // Calculate altitude
        const altitude = targetLocation.zoom ? Math.max(1500, 15000000 / Math.pow(2, targetLocation.zoom - 2)) : 5000;

        cesiumViewer.current.camera.flyTo({
          destination: Cartesian3.fromDegrees(targetLocation.lon, targetLocation.lat, altitude),
          orientation: {
            heading: CesiumMath.toRadians(0.0),
            pitch: CesiumMath.toRadians(-60.0),
            roll: 0.0
          },
          duration: 1.8
        });
      }
    }
  }, [targetLocation]);

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
        mapMode === '3D' ? 'opacity-100 pointer-events-auto z-0' : 'opacity-0 pointer-events-none -z-10'
      }`}
    >
      <div ref={viewerRef} className="w-full h-full" />
    </div>
  );
};

export default Map3D;
