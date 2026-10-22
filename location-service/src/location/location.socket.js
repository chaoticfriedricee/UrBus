'use strict'

// Coordenadas de Kinal y tolerancia
const kinalCoords = { lat: 14.6258, lng: -90.5360 };
const tolerance = 0.0002; // aprox 20 metros

const driverRoom = (driverId) => `driver:${driverId}`;

// Tiempo que se conserva la ruta de un conductor que perdió la conexión (app en segundo
// plano, cambio de red...) antes de darla por terminada. Mientras tanto los pasajeros ven
// la última posición marcada como "en pausa", nunca como ubicación en vivo.
const DEFAULT_GRACE_MS = 5 * 60 * 1000;

const graceFromEnv = () => {
    const value = Number(process.env.LOCATION_SHARING_GRACE_MS);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_GRACE_MS;
};

const passengerServiceUrl = () =>
    process.env.PASSENGER_SERVICE_URL || 'http://localhost:3011/urbus/v1';

/**
 * Pregunta a passenger-service (con el token del propio usuario) quién es y a
 * qué conductor puede seguir. Devuelve null si el token no es válido.
 */
export const fetchGroupAccess = async (token) => {
    const response = await fetch(`${passengerServiceUrl()}/groups/access`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
    });

    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error(`passenger-service respondió ${response.status}`);

    const body = await response.json();
    return body.data;
};

/**
 * Ubicación compartida por conductor:
 * - Cada conductor tiene una sala "driver:<id>". Entran el propio conductor y los
 *   pasajeros de sus grupos activos; el resto de usuarios no recibe nada.
 * - El conductor debe emitir "startSharing" antes de que se publique su ubicación,
 *   y deja de compartir con "stopSharing".
 * - Si se desconecta sin "stopSharing", la ruta queda en pausa (paused: true) durante
 *   graceMs: al reconectarse y volver a emitir "startSharing" continúa; si no, termina.
 * - Solo se guarda en memoria la última posición de quien está compartiendo; no
 *   hay historial.
 */
export const registerLocationSocket = (io, { getAccess = fetchGroupAccess, graceMs = graceFromEnv() } = {}) => {
    // driverId -> { lat, lng, updatedAt, timestamp, arrived, paused, graceTimer }
    const sharing = new Map();

    const statusFor = (driverId) => {
        const current = sharing.get(driverId);
        if (!current) return { sharing: false };
        const status = { sharing: true };
        if (current.paused) status.paused = true;
        if (current.lat === undefined) return status;
        // ageMs evita depender del reloj de cada dispositivo para saber qué tan vieja es la posición
        const ageMs = Math.max(0, Date.now() - Date.parse(current.updatedAt));
        return { ...status, lat: current.lat, lng: current.lng, updatedAt: current.updatedAt, ageMs };
    };

    const clearGrace = (current) => {
        clearTimeout(current.graceTimer);
        current.graceTimer = null;
        current.paused = false;
    };

    const stopSharing = (driverId) => {
        const current = sharing.get(driverId);
        if (!current) return;
        clearGrace(current);
        sharing.delete(driverId);
        io.to(driverRoom(driverId)).emit('locationStatus', { sharing: false });
    };

    const pauseSharing = (driverId) => {
        const current = sharing.get(driverId);
        if (!current || current.paused) return;
        current.paused = true;
        current.graceTimer = setTimeout(() => stopSharing(driverId), graceMs);
        current.graceTimer.unref?.();
        io.to(driverRoom(driverId)).emit('locationStatus', statusFor(driverId));
    };

    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;

        if (typeof token !== 'string' || !token) {
            return next(new Error('UNAUTHORIZED'));
        }

        try {
            const access = await getAccess(token);
            if (!access) return next(new Error('UNAUTHORIZED'));

            socket.data.access = access;
            next();
        } catch (err) {
            console.error(`No se pudo verificar el acceso a la ubicación: ${err.message}`);
            next(new Error('ACCESS_UNAVAILABLE'));
        }
    });

    io.on('connection', (socket) => {
        const { userId, role, driverId } = socket.data.access;
        const isDriver = role === 'DRIVER_ROLE';

        if (!driverId) {
            // Sin grupo activo (o administrador): no puede ver ninguna ubicación
            socket.emit('locationStatus', { sharing: false, reason: 'NO_GROUP' });
            return;
        }

        socket.join(driverRoom(driverId));
        socket.emit('locationStatus', statusFor(driverId));

        // Los pasajeros solo escuchan; únicamente el conductor publica su propia ubicación
        if (!isDriver) return;

        const room = driverRoom(userId);

        socket.on('startSharing', () => {
            const current = sharing.get(userId);
            // Reanudar tras una reconexión conserva la última posición conocida
            if (current) clearGrace(current);
            else sharing.set(userId, { arrived: false, paused: false, graceTimer: null });
            io.to(room).emit('locationStatus', statusFor(userId));
        });

        socket.on('stopSharing', () => stopSharing(userId));

        socket.on('busLocation', (coords) => {
            const current = sharing.get(userId);
            // Sin "startSharing" previo no se publica nada
            if (!current) return;

            // Ignorar payloads inválidos: un coords null/string tumbaba el proceso
            const lat = Number(coords?.lat);
            const lng = Number(coords?.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

            // timestamp: momento en que el GPS tomó la posición (reloj del conductor). Una
            // posición repetida o más vieja que la última (p. ej. reenviada tras reconectar)
            // no debe mover el bus hacia atrás.
            const timestamp = Number(coords.timestamp);
            if (Number.isFinite(timestamp)) {
                if (current.timestamp !== undefined && timestamp <= current.timestamp) return;
                current.timestamp = timestamp;
            }

            current.lat = lat;
            current.lng = lng;
            current.updatedAt = new Date().toISOString();

            io.to(room).emit('updateBus', { lat, lng, updatedAt: current.updatedAt });

            // Verificar llegada a Kinal
            const distanceLat = Math.abs(lat - kinalCoords.lat);
            const distanceLng = Math.abs(lng - kinalCoords.lng);
            const isAtKinal = distanceLat <= tolerance && distanceLng <= tolerance;

            if (!current.arrived && isAtKinal) {
                current.arrived = true;
                io.to(room).emit('busArrived');
            } else if (current.arrived && !isAtKinal) {
                // El bus salió de Kinal: permitir avisar la siguiente llegada
                current.arrived = false;
            }
        });

        socket.on('disconnect', async () => {
            // Perder la conexión no es lo mismo que terminar la ruta: el navegador o el sistema
            // suspenden la app en segundo plano y la conexión se corta. Se pausa (salvo que siga
            // conectado en otro dispositivo) y termina sola si no vuelve dentro de graceMs.
            const sockets = await io.in(room).fetchSockets();
            const driverStillConnected = sockets.some(
                (s) => s.data.access?.userId === userId && s.data.access?.role === 'DRIVER_ROLE'
            );
            if (!driverStillConnected) pauseSharing(userId);
        });
    });

    return { sharing };
};
