// src/shared/api/groupApi.js
// Endpoints de grupos de passenger-service (mismos que client-admin/src/shared/api/group.js)
import passengerClient from './passengerClient';

// POST /groups/join — requiere PASSENGER_ROLE o USER_ROLE. Si la cuenta aún no tiene
// perfil de pasajero, se crea con `name` (el nombre que verá el conductor)
export const joinGroup = (code, name) => passengerClient.post('/groups/join', { code, name });

// GET /groups — ADMIN ve todos, DRIVER solo los suyos (con passengerCount)
export const getGroups = () => passengerClient.get('/groups');

// GET /groups/:id — incluye los pasajeros del grupo (ADMIN o el DRIVER dueño)
export const getGroupById = (id) => passengerClient.get(`/groups/${id}`);

// POST /groups — requiere DRIVER_ROLE (el servidor aplica su límite de grupos)
export const createGroup = (data) => passengerClient.post('/groups', data);

// PATCH /groups/:id — { name?, isActive? } dueño (DRIVER) o ADMIN
export const updateGroup = (id, data) => passengerClient.patch(`/groups/${id}`, data);

// DELETE /groups/:id — dueño (DRIVER) o ADMIN
export const deleteGroup = (id) => passengerClient.delete(`/groups/${id}`);

// GET /groups/limit/me — DRIVER: { maxGroups, activeGroups, isCustom, defaultMaxGroups }
export const getMyGroupLimit = () => passengerClient.get('/groups/limit/me');

// GET /groups/limit/:driverId — ADMIN o el propio conductor
export const getGroupLimit = (driverId) => passengerClient.get(`/groups/limit/${driverId}`);

// PUT /groups/limit/:driverId — requiere ADMIN_ROLE (límite propio del conductor)
export const setGroupLimit = (driverId, maxGroups) =>
  passengerClient.put(`/groups/limit/${driverId}`, { maxGroups });

// DELETE /groups/limit/:driverId — requiere ADMIN_ROLE (vuelve al límite general)
export const resetGroupLimit = (driverId) => passengerClient.delete(`/groups/limit/${driverId}`);

// GET /groups/settings — requiere ADMIN_ROLE
export const getGroupSettings = () => passengerClient.get('/groups/settings');

// PUT /groups/settings — requiere ADMIN_ROLE
export const updateGroupSettings = (data) => passengerClient.put('/groups/settings', data);
