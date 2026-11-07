import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import OSMMapView from '../components/OSMMapView';
import { useBusTracking } from '../hooks/useBusTracking';
import { describeFreshness } from '../utils/locationFreshness';
import { EmptyState } from '../../../shared/components/common/Common';
import useAuthStore from '../../../shared/store/authStore';
import { getGroups } from '../../../shared/api/groupApi';
import { COLORS, SPACING, FONT_SIZE, RADIUS, ROLES } from '../../../shared/constants/theme';
import {
  getItinerary,
  getItineraryAccess,
  interruptGroupTrip,
  startGroupTrip,
  updateGroupDestination,
} from '../services/itineraryApi';

const DEFAULT_REGION = {
  latitude: 14.6258, longitude: -90.536, latitudeDelta: 0.03, longitudeDelta: 0.03,
};
const DEFAULT_DESTINATION = { latitude: 14.6258, longitude: -90.536, title: 'Kinal' };

function routeSummary(trip) {
  if (!trip) return 'El recorrido aparecerá cuando el conductor lo inicie';
  const distance = trip.distance >= 1000
    ? `${(trip.distance / 1000).toFixed(1)} km`
    : `${Math.round(trip.distance)} m`;
  const minutes = Math.max(1, Math.round(trip.duration / 60));
  const duration = minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
    : `${minutes} min`;
  return `${distance} · ${duration}`;
}

export default function BusTrackingScreen() {
  const user = useAuthStore((state) => state.user);
  const isDriver = user?.role === ROLES.DRIVER;
  const [access, setAccess] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [initialItinerary, setInitialItinerary] = useState(null);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [savingDestination, setSavingDestination] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const {
    coords, itinerary: socketItinerary, connected, error, gpsError,
    backgroundMode, startRoute, endRoute, openLocationSettings,
  } = useBusTracking(groupId, isDriver);

  const itinerary = socketItinerary?.groupId === groupId
    ? socketItinerary
    : initialItinerary?.groupId === groupId ? initialItinerary : null;
  const activeTrip = itinerary?.activeTrip ?? null;
  const serverTripActive = activeTrip?.status === 'EN_CURSO';
  const currentTrip = serverTripActive ? activeTrip : itinerary?.lastTrip ?? null;
  const destination = itinerary?.destination
    ? { latitude: itinerary.destination.lat, longitude: itinerary.destination.lng, title: 'Destino del grupo' }
    : DEFAULT_DESTINATION;
  const freshness = coords?.seenAt ? describeFreshness(coords, now) : null;
  const isLive = Boolean(serverTripActive && freshness?.state === 'live' && !coords?.paused);
  const region = coords
    ? { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_REGION;

  const groupLabel = useMemo(
    () => groups.find((group) => String(group._id) === groupId)?.name || groupId,
    [groups, groupId],
  );

  useEffect(() => {
    let active = true;
    getItineraryAccess().then(async (result) => {
      if (!active) return;
      setAccess(result);
      if (result.role === 'DRIVER_ROLE') {
        const response = await getGroups();
        if (!active) return;
        const ownedIds = new Set(result.ownedGroupIds ?? []);
        const rows = (response.data.data ?? []).filter((group) => ownedIds.has(String(group._id)));
        setGroups(rows);
        setGroupId((current) => current || [...ownedIds][0] || '');
      } else {
        setGroupId(result.memberGroupId ?? '');
      }
    }).catch((failure) => {
      if (active) setRequestError(failure.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!groupId) {
      setInitialItinerary(null);
      return undefined;
    }
    setLoadingItinerary(true);
    setInitialItinerary(null);
    getItinerary(groupId).then((result) => {
      if (active) setInitialItinerary(result);
    }).catch((failure) => {
      if (active) setRequestError(failure.message);
    }).finally(() => {
      if (active) setLoadingItinerary(false);
    });
    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = useCallback(async () => {
    if (!groupId || serverTripActive) return;
    setRequestError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setRequestError('Se necesita permiso de ubicación GPS para iniciar el recorrido.');
      return;
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      setRequestError('Activa el GPS del dispositivo antes de iniciar el recorrido.');
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
      });
      const origin = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      const trip = await startGroupTrip(groupId, origin);
      setInitialItinerary((current) => ({
        ...current,
        groupId,
        destination: trip.destination,
        activeTrip: trip,
      }));
      await startRoute();
    } catch (failure) {
      setRequestError(failure.message || 'No se pudo iniciar el recorrido.');
    }
  }, [groupId, serverTripActive, startRoute]);

  const handleEnd = useCallback(async () => {
    if (!groupId) return;
    try {
      const trip = await interruptGroupTrip(groupId);
      setInitialItinerary((current) => ({
        ...current,
        activeTrip: null,
        lastTrip: trip,
      }));
      endRoute();
    } catch (failure) {
      setRequestError(failure.message || 'No se pudo interrumpir el recorrido.');
    }
  }, [endRoute, groupId]);

  const handleDestinationChange = useCallback(async (point) => {
    if (!isDriver || !groupId || savingDestination) return;
    setSavingDestination(true);
    try {
      const result = await updateGroupDestination(groupId, {
        lat: point.lat,
        lng: point.lng,
      });
      setInitialItinerary((current) => ({
        ...current,
        destination: result.destination,
        activeTrip: result.activeTrip ?? current?.activeTrip ?? null,
      }));
    } catch (failure) {
      setRequestError(failure.message || 'No se pudo guardar el destino.');
      getItinerary(groupId).then(setInitialItinerary).catch(() => {});
    } finally {
      setSavingDestination(false);
    }
  }, [groupId, isDriver, savingDestination]);

  const noGroup = !groupId && Boolean(access);
  const routeStatus = serverTripActive
    ? activeTrip.gpsStatus === 'CONECTADO'
      ? 'Recorrido en curso · GPS conectado'
      : 'Recorrido en curso · esperando señal GPS'
    : currentTrip?.status === 'COMPLETADO'
      ? 'Recorrido completado'
      : currentTrip?.status === 'INTERRUMPIDO'
        ? 'Último recorrido interrumpido'
        : 'El bus todavía no ha comenzado';
  const bannerError = requestError || error || gpsError;

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
            <MaterialIcons name="map" size={18} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Mapa a Tiempo Real</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : '#d1d5db' }]} />
          <Text style={styles.connectionText}>{connected ? 'Conectado' : 'Desconectado'}</Text>
        </View>
      </LinearGradient>

      {isDriver && groups.length > 1 ? (
        <View style={styles.groupPicker}>
          <Text style={styles.groupLabel}>Grupo</Text>
          <View style={styles.groupChoices}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group._id}
                style={[styles.groupChoice, groupId === String(group._id) && styles.groupChoiceActive]}
                onPress={() => setGroupId(String(group._id))}
                disabled={serverTripActive}
              >
                <Text style={styles.groupChoiceText}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.tripStatus}>
        <MaterialIcons
          name={serverTripActive ? 'directions-bus' : 'info-outline'}
          size={16}
          color={serverTripActive ? COLORS.success : COLORS.textMuted}
        />
        <Text style={styles.tripStatusText}>
          {groupLabel ? `${groupLabel} · ` : ''}{routeStatus}
        </Text>
      </View>

      {bannerError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{bannerError}</Text>
        </View>
      ) : null}

      {serverTripActive && isDriver && backgroundMode === 'background' ? (
        <Text style={styles.hintText}>
          El GPS continúa enviándose en segundo plano mientras se muestra la notificación de recorrido activo.
        </Text>
      ) : null}

      {isDriver && serverTripActive && backgroundMode === 'foreground' ? (
        <View style={styles.foregroundNotice}>
          <Text style={styles.foregroundNoticeText}>
            Para mantener el seguimiento en segundo plano, permite ubicación «Todo el tiempo».
          </Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={openLocationSettings}>
            <MaterialIcons name="settings" size={14} color={COLORS.primary} />
            <Text style={styles.settingsBtnText}>Abrir ajustes</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {freshness ? (
        <View style={[styles.freshnessBadge, !isLive && styles.freshnessStale]}>
          <MaterialIcons name={isLive ? 'gps-fixed' : 'history'} size={14} color={isLive ? COLORS.success : COLORS.warning} />
          <Text style={[styles.freshnessText, !isLive && styles.freshnessTextStale]}>
            {isLive ? freshness.label : `Última ubicación conocida · ${freshness.label}`}
          </Text>
        </View>
      ) : null}

      {loadingItinerary ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : null}
      <View style={styles.mapWrap}>
        <OSMMapView
          style={styles.map}
          region={region}
          marker={coords ? {
            latitude: coords.lat,
            longitude: coords.lng,
            title: 'Bus UrBus',
            description: isLive ? 'Ubicación actual' : 'Última ubicación conocida',
            opacity: isLive ? 1 : 0.45,
          } : null}
          origin={serverTripActive ? {
            latitude: activeTrip.origin.lat,
            longitude: activeTrip.origin.lng,
            title: 'Origen GPS',
          } : null}
          destination={destination}
          routeGeometry={serverTripActive ? activeTrip.geometry : null}
          canEditDestination={isDriver}
          onDestinationChange={handleDestinationChange}
        />
        {!coords && !isDriver && (
          <View style={styles.emptyWrap}>
            <EmptyState
              message={noGroup
                ? 'Únete a un grupo para consultar el recorrido de tu bus'
                : 'El conductor todavía no ha iniciado un recorrido'}
              icon={noGroup ? 'group-add' : 'location-off'}
            />
          </View>
        )}
        {isDriver && (
          <View style={styles.routeSummary}>
            <Text style={styles.routeSummaryText}>
              {serverTripActive
                ? routeSummary(activeTrip)
                : 'Arrastra el marcador rojo para configurar el destino del grupo.'}
            </Text>
          </View>
        )}
      </View>

      {isDriver ? (
        <View style={styles.driverControls}>
          <TouchableOpacity
            style={[styles.routeBtn, styles.startBtn, serverTripActive && styles.btnDisabled]}
            onPress={handleStart}
            disabled={serverTripActive || !groupId}
          >
            <MaterialIcons name="play-arrow" size={18} color="#fff" />
            <Text style={styles.routeBtnText}>Iniciar recorrido</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.routeBtn, styles.endBtn, !serverTripActive && styles.btnDisabled]}
            onPress={handleEnd}
            disabled={!serverTripActive}
          >
            <MaterialIcons name="stop" size={18} color="#fff" />
            <Text style={styles.routeBtnText}>Interrumpir</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: '#fff' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  groupPicker: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  groupLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '700', marginBottom: 5 },
  groupChoices: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  groupChoice: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  groupChoiceActive: { borderColor: COLORS.primary, backgroundColor: '#e8f0fe' },
  groupChoiceText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.text },
  tripStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: SPACING.md },
  tripStatusText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textLight, textAlign: 'center' },
  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  emptyWrap: { position: 'absolute', top: 45, left: 10, right: 10 },
  routeSummary: { position: 'absolute', bottom: 76, left: 10, right: 10, alignItems: 'center', padding: 8, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.96)' },
  routeSummaryText: { color: COLORS.text, textAlign: 'center', fontSize: FONT_SIZE.xs, fontWeight: '700' },
  loader: { marginVertical: 4 },
  hintText: { fontSize: FONT_SIZE.xs, color: COLORS.textLight, textAlign: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  foregroundNotice: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  foregroundNoticeText: { fontSize: FONT_SIZE.xs, color: '#92400e', textAlign: 'center' },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, alignSelf: 'center', marginTop: 6, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface },
  settingsBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary },
  freshnessBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: '#f0fdf4' },
  freshnessStale: { backgroundColor: '#fffbeb' },
  freshnessText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.success },
  freshnessTextStale: { color: COLORS.warning },
  errorBanner: { backgroundColor: '#fee2e2', marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.sm, fontWeight: '600', textAlign: 'center' },
  driverControls: { position: 'absolute', bottom: SPACING.lg, left: SPACING.md, right: SPACING.md, flexDirection: 'row', gap: SPACING.sm },
  routeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.md },
  startBtn: { backgroundColor: COLORS.success },
  endBtn: { backgroundColor: COLORS.error },
  btnDisabled: { opacity: 0.5 },
  routeBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },
});
