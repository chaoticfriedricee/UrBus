// src/features/bus/screens/BusTrackingScreen.jsx
// Pantalla "Mapa a Tiempo Real" — replica el mockup: encabezado azul con título
// e iconos, mapa de fondo claro y marcador del bus. Para DRIVER_ROLE agrega los
// controles "Iniciar Ruta" / "Finalizar Ruta", que comparten su ubicación con los
// pasajeros de sus grupos. Los pasajeros solo ven la ubicación de su conductor y
// únicamente mientras él la comparte. Una posición vieja se muestra con su antigüedad,
// nunca como ubicación en vivo.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import OSMMapView from '../components/OSMMapView';
import { useBusTracking } from '../hooks/useBusTracking';
import { describeFreshness } from '../utils/locationFreshness';
import { EmptyState } from '../../../shared/components/common/Common';
import useAuthStore from '../../../shared/store/authStore';
import { COLORS, SPACING, FONT_SIZE, RADIUS, ROLES } from '../../../shared/constants/theme';

// Coordenadas de Kinal (destino de referencia usado por location-service)
const DEFAULT_REGION = { latitude: 14.6258, longitude: -90.536, latitudeDelta: 0.03, longitudeDelta: 0.03 };

export default function BusTrackingScreen() {
  const user = useAuthStore((state) => state.user);
  const isDriver = user?.role === ROLES.DRIVER;

  const {
    coords, arrived, connected, sharing, noGroup, error, gpsError, routeActive, pausedRoute, startRoute, endRoute,
  } = useBusTracking();

  // Refresca el "hace X" mientras hay una posición en pantalla (solo re-renderiza)
  const [now, setNow] = useState(() => Date.now());
  const hasCoords = Boolean(coords);
  useEffect(() => {
    if (!hasCoords) return undefined;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [hasCoords]);

  const freshness = coords?.seenAt ? describeFreshness(coords, now) : null;
  const isLive = freshness?.state === 'live';
  const canEndRoute = routeActive || pausedRoute;
  const bannerError = error || gpsError;

  // Para quien no es conductor: nunca se insinúa una ubicación en vivo si no se está compartiendo
  let emptyMessage = 'Esperando ubicación del bus';
  let emptyIcon = 'directions-bus';
  if (noGroup) {
    emptyMessage = user?.role === ROLES.ADMIN
      ? 'La ubicación solo la ven el conductor y los pasajeros de su grupo'
      : 'Únete a un grupo con el código de tu conductor para ver la ubicación del bus';
    emptyIcon = 'group-add';
  } else if (sharing === false) {
    emptyMessage = 'Tu conductor no está compartiendo su ubicación en este momento';
    emptyIcon = 'location-off';
  }

  const region = coords
    ? { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.headerBlueStart, COLORS.headerBlueEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <MaterialIcons name="forum" size={18} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Mapa a Tiempo Real</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : '#d1d5db' }]} />
          <MaterialIcons name="search" size={20} color="#fff" />
        </View>
      </LinearGradient>

      {arrived ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>El bus llegó a su destino</Text>
        </View>
      ) : null}

      {bannerError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{bannerError}</Text>
        </View>
      ) : null}

      {isDriver ? (
        <View style={styles.sharingBadge}>
          <MaterialIcons
            name={routeActive ? 'location-on' : pausedRoute ? 'pause-circle-outline' : 'location-off'}
            size={14}
            color={routeActive ? COLORS.success : pausedRoute ? COLORS.warning : COLORS.textMuted}
          />
          <Text style={styles.sharingText}>
            {routeActive
              ? 'Compartiendo tu ubicación con tus grupos'
              : pausedRoute
                ? 'Tu ruta quedó en pausa: inicia la ruta para reanudarla o finalízala'
                : 'No estás compartiendo tu ubicación'}
          </Text>
        </View>
      ) : null}

      {isDriver && routeActive ? (
        <Text style={styles.hintText}>
          Mantén UrBus abierta en pantalla: en segundo plano o con la pantalla bloqueada el teléfono pausa el envío y se reanuda al volver.
        </Text>
      ) : null}

      {freshness ? (
        <View style={[styles.freshnessBadge, !isLive && styles.freshnessStale]}>
          <MaterialIcons name={isLive ? 'gps-fixed' : 'history'} size={14} color={isLive ? COLORS.success : COLORS.warning} />
          <Text style={[styles.freshnessText, !isLive && styles.freshnessTextStale]}>{freshness.label}</Text>
        </View>
      ) : null}

      {!coords && !isDriver ? (
        <View style={styles.emptyWrap}>
          <EmptyState message={emptyMessage} icon={emptyIcon} />
        </View>
      ) : (
        <OSMMapView
          style={styles.map}
          region={region}
          destination={
            coords
              ? {
                  latitude: DEFAULT_REGION.latitude,
                  longitude: DEFAULT_REGION.longitude,
                  title: 'Kinal',
                  description: 'Destino del bus',
                }
              : null
          }
          marker={
            coords
              ? {
                  latitude: coords.lat,
                  longitude: coords.lng,
                  title: 'Bus UrBus',
                  description: isLive ? 'Ubicación en tiempo real' : 'Última ubicación conocida',
                  opacity: isLive ? 1 : 0.45,
                }
              : null
          }
        />
      )}

      {isDriver ? (
        <View style={styles.driverControls}>
          <TouchableOpacity
            style={[styles.routeBtn, styles.startBtn, routeActive && styles.btnDisabled]}
            onPress={startRoute}
            disabled={routeActive}
          >
            <MaterialIcons name="play-arrow" size={18} color="#fff" />
            <Text style={styles.routeBtnText}>Iniciar Ruta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.routeBtn, styles.endBtn, !canEndRoute && styles.btnDisabled]}
            onPress={endRoute}
            disabled={!canEndRoute}
          >
            <MaterialIcons name="stop" size={18} color="#fff" />
            <Text style={styles.routeBtnText}>Finalizar Ruta</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 54, paddingBottom: SPACING.md, paddingHorizontal: SPACING.md,
    borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  headerTitle: { color: '#fff', fontSize: FONT_SIZE.lg, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  map: { flex: 1 },
  emptyWrap: { flex: 1 },
  sharingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    marginVertical: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.surface,
  },
  sharingText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textLight },
  hintText: {
    fontSize: FONT_SIZE.xs, color: COLORS.textLight, textAlign: 'center',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm,
  },
  freshnessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.pill, backgroundColor: '#f0fdf4',
  },
  freshnessStale: { backgroundColor: '#fffbeb' },
  freshnessText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.success },
  freshnessTextStale: { color: COLORS.warning },
  banner: {
    position: 'absolute', top: 110, left: SPACING.md, right: SPACING.md, zIndex: 10,
    backgroundColor: COLORS.success, borderRadius: RADIUS.md, paddingVertical: SPACING.sm, alignItems: 'center',
  },
  bannerText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
  errorBanner: {
    position: 'absolute', top: 110, left: SPACING.md, right: SPACING.md, zIndex: 10,
    backgroundColor: '#fee2e2', borderRadius: RADIUS.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.sm, fontWeight: '600', textAlign: 'center' },
  driverControls: { position: 'absolute', bottom: SPACING.lg, left: SPACING.md, right: SPACING.md, flexDirection: 'row', gap: SPACING.sm },
  routeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.md },
  startBtn: { backgroundColor: COLORS.success },
  endBtn: { backgroundColor: COLORS.error },
  btnDisabled: { opacity: 0.5 },
  routeBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },
});