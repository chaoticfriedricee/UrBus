'use strict'

// Coordenadas de Kinal y tolerancia
const kinalCoords = { lat: 14.6258, lng: -90.5360 };
const tolerance = 0.0002; // aprox 20 metros

const driverRoom = (driverId) => `driver:${driverId}`;

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
 *   y deja de compartir con "stopSharing" o al desconectarse.
 * - Solo se guarda en memoria la última posición de quien está compartiendo; no
 *   hay historial.
 */
export const registerLocationSocket = (io, { getAccess = fetchGroupAccess } = {}) => {
    // driverId -> { lat, lng, updatedAt, arrived }
    const sharing = new Map();

    const statusFor = (driverId) => {
        const current = sharing.get(driverId);
        if (!current) return { sharing: false };
        if (current.lat === undefined) return { sharing: true };
        return { sharing: true, lat: current.lat, lng: current.lng, updatedAt: current.updatedAt };
    };

    const stopSharing = (driverId) => {
        if (!sharing.delete(driverId)) return;
        io.to(driverRoom(driverId)).emit('locationStatus', { sharing: false });
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
            if (!sharing.has(userId)) sharing.set(userId, { arrived: false });
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
            // Si el conductor cierra la app deja de compartir, salvo que siga conectado en otro dispositivo
            const sockets = await io.in(room).fetchSockets();
            const driverStillConnected = sockets.some(
                (s) => s.data.access?.userId === userId && s.data.access?.role === 'DRIVER_ROLE'
            );
            if (!driverStillConnected) stopSharing(userId);
        });
    });

    return { sharing };
};
