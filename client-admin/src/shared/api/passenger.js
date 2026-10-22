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

export const getPassengers = () =>
    axiosPassenger.get('/passengers');

// POST /api/v1/passengers  — requiere ADMIN_ROLE
export const createPassenger = (data) =>
    axiosPassenger.post('passengers', data);

// PATCH /api/v1/passengers/:id/status  — ADMIN, DRIVER o propio PASSENGER
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
