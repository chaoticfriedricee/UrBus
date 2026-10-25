// src/shared/api/groupApi.js
import passengerClient from './passengerClient';

// POST /groups/join — requiere PASSENGER_ROLE o USER_ROLE. Si la cuenta aún no tiene
// perfil de pasajero, se crea con `name` (el nombre que verá el conductor)
export const joinGroup = (code, name) => passengerClient.post('/groups/join', { code, name });

// GET /groups — ADMIN ve todos, DRIVER solo los suyos
export const getGroups = () => passengerClient.get('/groups');
