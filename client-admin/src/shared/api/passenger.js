import axios from '../utils/axios.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { withTokenRefresh } from './api.js';

const axiosPassenger = withTokenRefresh(axios.create({
    baseURL: import.meta.env.VITE_PASSENGER_URL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
}));

axiosPassenger.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if(token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// GET /api/v1/passengers[?groupId=]  — con groupId, solo los pasajeros de ese grupo
// (ADMIN o el DRIVER dueño del grupo)
export const getPassengers = (groupId) =>
    axiosPassenger.get('/passengers', { params: groupId ? { groupId } : undefined });

// GET /api/v1/passengers/me  — perfil de pasajero del usuario, con su grupo
export const getMyPassenger = () =>
    axiosPassenger.get('/passengers/me');

// POST /api/v1/passengers  — requiere ADMIN_ROLE
export const createPassenger = (data) =>
    axiosPassenger.post('passengers', data);

// PUT /api/v1/passengers/:id  — ADMIN o DRIVER (editar nombre)
export const updatePassenger = (id, data) =>
    axiosPassenger.put(`/passengers/${id}`, data);

// PATCH /api/v1/passengers/:id/status  — solo ADMIN o DRIVER
export const updatePassengerStatus = (id, data) =>
    axiosPassenger.patch(`/passengers/${id}/status`, { status: data });

// PUT /api/v1/passengers/:id/absence-reason  — ADMIN o DRIVER
export const setAbsenceReason = (id, payload) =>
    axiosPassenger.put(`/passengers/${id}/absence-reason`, payload);

// DELETE /api/v1/passengers/:id/absence-reason  — ADMIN o DRIVER
export const clearAbsenceReason = (id) =>
    axiosPassenger.delete(`/passengers/${id}/absence-reason`);

// DELETE /api/v1/passengers/:id  — requiere ADMIN_ROLE
export const deletePassenger = (id) =>
    axiosPassenger.delete(`/passengers/${id}`)
