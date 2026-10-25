// src/features/bus/services/backgroundLocation.js
// GPS del conductor en segundo plano (Android: servicio en primer plano con notificación fija).
//
// Con el permiso "Permitir siempre", Android sigue entregando posiciones aunque el conductor
// cambie a WhatsApp o bloquee la pantalla, mientras la notificación esté visible. La tarea
// reenvía cada posición al manejador que registra useBusTracking (el mismo que usa el
// watcher en primer plano), que la envía por el socket ya conectado.
//
// Si el conductor cierra la app deslizándola, killServiceOnDestroy detiene el servicio: la
// ruta queda en pausa en location-service y termina sola si no vuelve (igual que en la web).
// Si aun así la tarea se ejecuta sin la pantalla del mapa montada (sin socket), se detiene
// en vez de mostrar "compartiendo" sin enviar nada.
//
// Este archivo debe importarse desde index.js: Android puede ejecutar la tarea al arrancar
// la app y TaskManager.defineTask tiene que haberse llamado antes.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { COLORS } from '../../../shared/constants/theme';

export const BACKGROUND_LOCATION_TASK = 'urbus-driver-location';

let fixHandler = null;

/** useBusTracking registra aquí su manejador de posiciones (null al desmontarse). */
export function setBackgroundFixHandler(handler) {
  fixHandler = handler;
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = data?.locations ?? [];
  if (locations.length === 0) return;

  if (!fixHandler) {
    // Nadie puede enviar estas posiciones: se apaga el servicio y su notificación
    await stopBackgroundLocation();
    return;
  }

  // Android puede entregar varias juntas; solo la más reciente sirve para el mapa en vivo
  const latest = locations.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
  fixHandler(latest);
});

const TASK_OPTIONS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 2000,
  distanceInterval: 0,
  // iOS: no pausar con el bus detenido y mostrar el indicador azul de ubicación
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.AutomotiveNavigation,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'UrBus · Ruta activa',
    notificationBody: 'Compartiendo tu ubicación con los pasajeros de tus grupos',
    notificationColor: COLORS.primary,
    killServiceOnDestroy: true,
  },
};

/**
 * Pide "Permitir siempre" (en Android 11+ el sistema lleva al conductor a Ajustes).
 * Devuelve true si quedó concedido. Requiere el permiso en primer plano ya concedido.
 */
export async function requestBackgroundPermission() {
  try {
    const current = await Location.getBackgroundPermissionsAsync();
    if (current.status === 'granted') return true;
    if (!current.canAskAgain) return false;
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function hasBackgroundPermission() {
  try {
    return (await Location.getBackgroundPermissionsAsync()).status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Inicia las actualizaciones en segundo plano. Devuelve false si el dispositivo o el entorno
 * no lo permite (p. ej. Expo Go): quien llama sigue con el watcher en primer plano.
 */
export async function startBackgroundLocation() {
  try {
    if (!(await TaskManager.isAvailableAsync())) return false;
    if (!(await Location.isBackgroundLocationAvailableAsync())) return false;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, TASK_OPTIONS);
    return true;
  } catch {
    return false;
  }
}

export async function isBackgroundLocationRunning() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function stopBackgroundLocation() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    // La tarea ya no estaba registrada: no hay nada que detener
  }
}
