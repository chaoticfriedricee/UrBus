import { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './LocationMap.css';

const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL
  || 'https://tiles.openfreemap.org/styles/liberty';

setWorkerUrl(mapLibreWorkerUrl);

const POI_LAYER_PATTERN = /poi|amenity|shop|tourism|hotel|restaurant|food|bank|school|hospital|clinic|museum|attraction|landmark|historic|airport|aerodrome|building-3d|hillshade|contour/i;

function createMarkerElement(kind) {
  const element = document.createElement('div');
  element.className = `urbus-map-marker urbus-map-marker-${kind}`;
  element.setAttribute('aria-label', {
    bus: 'Ubicación del vehículo',
    origin: 'Origen del recorrido',
    destination: 'Destino del grupo',
  }[kind]);
  return element;
}

function fitRoute(map, geometry) {
  if (!Array.isArray(geometry?.coordinates) || geometry.coordinates.length < 2) return;
  const bounds = geometry.coordinates.reduce(
    (result, coordinate) => result.extend(coordinate),
    new LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]),
  );
  map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 500 });
}

export default function LocationMap({
  vehicle,
  vehicleOpacity = 1,
  origin,
  destination,
  routeGeometry,
  canEditDestination = false,
  onDestinationChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const onDestinationChangeRef = useRef(onDestinationChange);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onDestinationChangeRef.current = onDestinationChange;
  }, [onDestinationChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [-90.536, 14.6258],
      zoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      for (const layer of map.getStyle().layers) {
        if (POI_LAYER_PATTERN.test(`${layer.id} ${layer['source-layer'] || ''}`)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
      map.setTerrain(null);
      map.addSource('urbus-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'urbus-route-casing',
        type: 'line',
        source: 'urbus-route',
        paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: 'urbus-route-line',
        type: 'line',
        source: 'urbus-route',
        paint: { 'line-color': '#005691', 'line-width': 5, 'line-opacity': 0.95 },
      });
      setMapReady(true);
    });

    return () => {
      Object.values(markerRefs.current).forEach(({ marker }) => marker.remove());
      markerRefs.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const markerLocations = { bus: vehicle, origin, destination };
    for (const [kind, point] of Object.entries(markerLocations)) {
      const current = markerRefs.current[kind];
      if (!point) {
        current?.marker.remove();
        delete markerRefs.current[kind];
        continue;
      }

      if (!current) {
        const marker = new Marker({
          element: createMarkerElement(kind),
          draggable: kind === 'destination' && canEditDestination,
        }).setLngLat([point.lng, point.lat]).addTo(map);
        if (kind === 'destination') {
          marker.on('dragend', () => {
            const position = marker.getLngLat();
            onDestinationChangeRef.current?.({ lat: position.lat, lng: position.lng });
          });
        }
        markerRefs.current[kind] = { marker };
      } else {
        current.marker.setLngLat([point.lng, point.lat]);
        if (kind === 'destination') current.marker.setDraggable(canEditDestination);
      }
      markerRefs.current[kind].marker.getElement().style.opacity = String(kind === 'bus' ? vehicleOpacity : 1);
    }
  }, [mapReady, vehicle, vehicleOpacity, origin, destination, canEditDestination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const source = map.getSource('urbus-route');
    if (!routeGeometry) {
      source?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    source?.setData({ type: 'Feature', properties: {}, geometry: routeGeometry });
    fitRoute(map, routeGeometry);
  }, [mapReady, routeGeometry]);

  return (
    <div
      ref={containerRef}
      className="urbus-location-map"
      style={{ cursor: canEditDestination ? 'grab' : undefined }}
      aria-label="Mapa de calles y recorrido del vehículo"
    />
  );
}
