// src/shared/api/passengerApi.js
// Endpoints de gestión de pasajeros, portados de client-admin (shared/api/passenger.js).
// passenger-service expone create / list / me / editar nombre / status / delete.
import passengerClient from './passengerClient';

export const getPassengers = () => passengerClient.get('/passengers');

export const getMyPassengerStatus = () => passengerClient.get('/passengers/me');

// POST /passengers — requiere ADMIN_ROLE o DRIVER_ROLE
export const createPassenger = (data) => passengerClient.post('/passengers', data);

// PATCH /passengers/:id/status — solo ADMIN o DRIVER marcan la asistencia
export const updatePassengerStatus = (id, status) =>
    passengerClient.patch(`/passengers/${id}/status`, { status });

// DELETE /passengers/:id — requiere ADMIN_ROLE
export const deletePassenger = (id) => passengerClient.delete(`/passengers/${id}`);