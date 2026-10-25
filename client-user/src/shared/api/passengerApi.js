// src/shared/api/passengerApi.js
// Endpoints de gestión de pasajeros, portados de client-admin (shared/api/passenger.js).
// passenger-service expone create / list / me / editar nombre / status / delete.
import passengerClient from './passengerClient';

// Con groupId, solo los pasajeros de ese grupo (ADMIN o el DRIVER dueño del grupo)
export const getPassengers = (groupId) =>
    passengerClient.get('/passengers', { params: groupId ? { groupId } : undefined });

export const getMyPassengerStatus = () => passengerClient.get('/passengers/me');

// POST /passengers — requiere ADMIN_ROLE o DRIVER_ROLE
export const createPassenger = (data) => passengerClient.post('/passengers', data);

// PUT /passengers/:id — ADMIN o DRIVER (editar el nombre)
export const updatePassenger = (id, data) => passengerClient.put(`/passengers/${id}`, data);

// PUT /passengers/:id/absence-reason — { reason: SALUD|EMERGENCIA|EXTRACURRICULAR|OTRO, note? }
export const setAbsenceReason = (id, payload) => passengerClient.put(`/passengers/${id}/absence-reason`, payload);

// DELETE /passengers/:id/absence-reason — ADMIN o DRIVER
export const clearAbsenceReason = (id) => passengerClient.delete(`/passengers/${id}/absence-reason`);

// PATCH /passengers/:id/status — solo ADMIN o DRIVER marcan la asistencia
export const updatePassengerStatus = (id, status) =>
    passengerClient.patch(`/passengers/${id}/status`, { status });

// DELETE /passengers/:id — requiere ADMIN_ROLE
export const deletePassenger = (id) => passengerClient.delete(`/passengers/${id}`);