import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL
  || 'https://tiles.openfreemap.org/styles/liberty';
function buildHtml(initialLat, initialLng, initialZoom) {
  const config = JSON.stringify({ styleUrl: MAP_STYLE_URL });
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .marker { display:flex; width:30px; height:30px; align-items:center; justify-content:center;
      border:3px solid #fff; border-radius:50%; color:#fff; font:700 13px system-ui,sans-serif;
      box-shadow:0 1px 5px rgba(0,0,0,.45); }
    .vehicle { width:38px; height:38px; border-width:2px; background:#005691; font-size:22px; }
    .vehicle::after { content:'🚌'; }
    .origin { background:#16a34a; }
    .origin::after { content:'A'; }
    .destination { background:#dc2626; }
    .destination::after { content:'B'; }
    .maplibregl-ctrl-attrib { font-size:9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js"></script>
  <script>
    const CONFIG = ${config};
    const map = new maplibregl.Map({
      container: 'map',
      style: CONFIG.styleUrl,
      center: [${initialLng}, ${initialLat}],
      zoom: ${initialZoom},
      pitch: 0,
      bearing: 0,
      attributionControl: true
    });
    const state = { vehicle: null, origin: null, destination: null, routeGeometry: null, canEditDestination: false };
    const markers = {};
    const pendingMessages = [];
    let mapReady = false;

    function notifyNative(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    function hideUnneededLayers() {
      for (const layer of map.getStyle().layers) {
        if (/poi|amenity|shop|tourism|hotel|restaurant|food|bank|school|hospital|clinic|museum|attraction|landmark|historic|airport|aerodrome|building-3d|hillshade|contour/i.test(
          layer.id + ' ' + (layer['source-layer'] || '')
        )) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
      map.setTerrain(null);
    }

    function updateMarker(kind, point, title, opacity, draggable = false) {
      if (!point) {
        markers[kind]?.remove();
        delete markers[kind];
        return;
      }
      if (!markers[kind]) {
        const element = document.createElement('div');
        element.className = 'marker ' + kind;
        element.setAttribute('aria-label', title || kind);
        const marker = new maplibregl.Marker({ element, draggable }).setLngLat([point.lng, point.lat]).addTo(map);
        if (kind === 'destination') {
          marker.on('dragend', () => {
            const position = marker.getLngLat();
            state.destination = { lat: position.lat, lng: position.lng };
            notifyNative({ type: 'DESTINATION_CHANGED', point: state.destination });
          });
        }
        markers[kind] = marker;
      } else {
        markers[kind].setLngLat([point.lng, point.lat]);
        if (kind === 'destination') markers[kind].setDraggable(draggable);
      }
      markers[kind].getElement().style.opacity = String(typeof opacity === 'number' ? opacity : 1);
    }

    function updateRoute(geometry) {
      state.routeGeometry = geometry;
      const source = map.getSource('urbus-route');
      if (!geometry) {
        source?.setData({ type: 'FeatureCollection', features: [] });
        return;
      }
      source?.setData({ type: 'Feature', properties: {}, geometry });
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return;
      const bounds = geometry.coordinates.reduce(
        (resultBounds, coordinate) => resultBounds.extend(coordinate),
        new maplibregl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0])
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 400 });
    }

    function setVehicle(point, title, description, opacity) {
      state.vehicle = point;
      updateMarker('vehicle', point, title || description, opacity);
    }

    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (!mapReady) {
          pendingMessages.push(data);
          return;
        }
        applyMessage(data);
      } catch (error) {
        console.error('No se pudo procesar el mensaje del mapa:', error);
      }
    }

    function applyMessage(data) {
      if (data.type === 'SET_VEHICLE') {
        setVehicle(data.point, data.title, data.description, data.opacity);
      } else if (data.type === 'SET_ORIGIN') {
        state.origin = data.point;
        updateMarker('origin', state.origin, data.title || 'Origen de la ruta');
      } else if (data.type === 'SET_DESTINATION') {
        state.destination = data.point;
        state.canEditDestination = Boolean(data.canEdit);
        updateMarker('destination', state.destination, data.title || 'Destino de la ruta', 1, state.canEditDestination);
      } else if (data.type === 'SET_ROUTE') {
        updateRoute(data.geometry);
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    map.on('load', () => {
      hideUnneededLayers();
      map.addSource('urbus-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'urbus-route-casing', type: 'line', source: 'urbus-route',
        paint: { 'line-color': '#fff', 'line-width': 9, 'line-opacity': 0.9 }
      });
      map.addLayer({
        id: 'urbus-route-line', type: 'line', source: 'urbus-route',
        paint: { 'line-color': '#005691', 'line-width': 5, 'line-opacity': 0.95 }
      });
      mapReady = true;
      while (pendingMessages.length) applyMessage(pendingMessages.shift());
    });
    map.on('error', () => {
      if (!mapReady) notifyNative({
        type: 'MAP_ERROR',
        error: 'No se pudo cargar la cartografía. Comprueba tu conexión.',
      });
    });

  </script>
</body>
</html>
`;
}

export default function OSMMapView({
  region,
  marker,
  origin,
  destination,
  routeGeometry,
  canEditDestination = false,
  onDestinationChange,
  onRouteChange,
  style,
}) {
  const webviewRef = useRef(null);
  const [webviewLoaded, setWebviewLoaded] = useState(false);
  const markerLatitude = marker?.latitude;
  const markerLongitude = marker?.longitude;
  const markerTitle = marker?.title;
  const markerDescription = marker?.description;
  const markerOpacity = marker?.opacity;
  const originLatitude = origin?.latitude;
  const originLongitude = origin?.longitude;
  const destinationLatitude = destination?.latitude;
  const destinationLongitude = destination?.longitude;
  const destinationTitle = destination?.title;
  const canEdit = canEditDestination;
  const [initialRegion] = useState(() => ({
    latitude: region.latitude,
    longitude: region.longitude,
  }));
  const html = useMemo(
    () => buildHtml(initialRegion.latitude, initialRegion.longitude, 15),
    [initialRegion.latitude, initialRegion.longitude],
  );
  const source = useMemo(() => ({ html }), [html]);

  useEffect(() => {
    if (!webviewLoaded || !webviewRef.current) return;
    webviewRef.current.postMessage(JSON.stringify({
      type: 'SET_VEHICLE',
      point: markerLatitude == null || markerLongitude == null
        ? null
        : { lat: markerLatitude, lng: markerLongitude },
      title: markerTitle,
      description: markerDescription,
      opacity: markerOpacity,
    }));
  }, [webviewLoaded, markerLatitude, markerLongitude, markerTitle, markerDescription, markerOpacity]);

  useEffect(() => {
    if (!webviewLoaded || !webviewRef.current) return;
    webviewRef.current.postMessage(JSON.stringify({
      type: 'SET_ORIGIN',
      point: originLatitude == null || originLongitude == null
        ? null
        : { lat: originLatitude, lng: originLongitude },
      title: 'Origen de la ruta',
    }));
  }, [webviewLoaded, originLatitude, originLongitude]);

  useEffect(() => {
    if (!webviewLoaded || !webviewRef.current) return;
    webviewRef.current.postMessage(JSON.stringify({
      type: 'SET_DESTINATION',
      point: destinationLatitude == null || destinationLongitude == null
        ? null
        : { lat: destinationLatitude, lng: destinationLongitude },
      title: destinationTitle || 'Destino de la ruta',
      canEdit,
    }));
  }, [webviewLoaded, destinationLatitude, destinationLongitude, destinationTitle, canEdit]);

  useEffect(() => {
    if (!webviewLoaded || !webviewRef.current) return;
    webviewRef.current.postMessage(JSON.stringify({
      type: 'SET_ROUTE',
      geometry: routeGeometry ?? null,
    }));
  }, [webviewLoaded, routeGeometry]);

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'DESTINATION_CHANGED' && canEditDestination) {
        onDestinationChange?.(message.point);
      }
      if (message.type === 'MAP_ERROR') onRouteChange?.({ status: 'error', error: message.error });
    } catch (error) {
      console.error('No se pudo procesar la respuesta del mapa:', error);
    }
  };

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      source={source}
      style={[styles.webview, style]}
      javaScriptEnabled
      domStorageEnabled
      onLoadEnd={() => setWebviewLoaded(true)}
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
