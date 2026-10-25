// src/features/bus/components/OSMMapView.jsx
// Reemplazo de react-native-maps (Google) usando Leaflet + tiles de
// OpenStreetMap dentro de un WebView. No requiere API key, tarjeta,
// ni build nativo — funciona directo en Expo Go.
import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

function buildHtml(initialLat, initialLng, initialZoom) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([${initialLat}, ${initialLng}], ${initialZoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;
    let destinationMarker = null;

    function setMarker(lat, lng, title, description, opacity) {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng]).addTo(map);
      }
      // Atenuado cuando es solo la última ubicación conocida
      marker.setOpacity(typeof opacity === 'number' ? opacity : 1);
      if (title || description) {
        marker.bindPopup('<b>' + (title || '') + '</b><br/>' + (description || ''));
      }
      map.setView([lat, lng], map.getZoom());
    }

    function removeMarker() {
      if (marker) {
        map.removeLayer(marker);
        marker = null;
      }
    }

    function setDestination(lat, lng, title, description) {
      if (destinationMarker) {
        destinationMarker.setLatLng([lat, lng]);
      } else {
        destinationMarker = L.marker([lat, lng]).addTo(map);
      }
      if (title || description) {
        destinationMarker.bindPopup('<b>' + (title || '') + '</b><br/>' + (description || ''));
      }
    }

    function removeDestination() {
      if (destinationMarker) {
        map.removeLayer(destinationMarker);
        destinationMarker = null;
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SET_MARKER') {
          setMarker(data.lat, data.lng, data.title, data.description, data.opacity);
        } else if (data.type === 'REMOVE_MARKER') {
          removeMarker();
        } else if (data.type === 'SET_DESTINATION') {
          setDestination(data.lat, data.lng, data.title, data.description);
        } else if (data.type === 'REMOVE_DESTINATION') {
          removeDestination();
        } else if (data.type === 'SET_REGION') {
          map.setView([data.lat, data.lng], data.zoom || map.getZoom());
        }
      } catch (e) {}
    }
  </script>
</body>
</html>
`;
}

/**
 * Props:
 * - region: { latitude, longitude, latitudeDelta, longitudeDelta }
 * - marker: { latitude, longitude, title, description, opacity? } | null
 * - destination: { latitude, longitude, title, description } | null (marcador fijo, ej. Kinal)
 * - style: estilos del contenedor
 */
export default function OSMMapView({ region, marker, destination, style }) {
  const webviewRef = useRef(null);
  const html = useMemo(
    () => buildHtml(region.latitude, region.longitude, 16),
    // Solo se genera una vez con la región inicial; después todo se actualiza vía postMessage
    []
  );

  useEffect(() => {
    if (!webviewRef.current) return;
    if (marker) {
      webviewRef.current.postMessage(
        JSON.stringify({
          type: 'SET_MARKER',
          lat: marker.latitude,
          lng: marker.longitude,
          title: marker.title,
          description: marker.description,
          opacity: marker.opacity,
        })
      );
    } else {
      webviewRef.current.postMessage(JSON.stringify({ type: 'REMOVE_MARKER' }));
    }
  }, [marker?.latitude, marker?.longitude, marker?.title, marker?.description, marker?.opacity]);

  useEffect(() => {
    if (!webviewRef.current) return;
    if (destination) {
      webviewRef.current.postMessage(
        JSON.stringify({
          type: 'SET_DESTINATION',
          lat: destination.latitude,
          lng: destination.longitude,
          title: destination.title,
          description: destination.description,
        })
      );
    } else {
      webviewRef.current.postMessage(JSON.stringify({ type: 'REMOVE_DESTINATION' }));
    }
  }, [destination?.latitude, destination?.longitude, destination?.title, destination?.description]);

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      source={{ html }}
      style={[styles.webview, style]}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});