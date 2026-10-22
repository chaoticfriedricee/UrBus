import axios from '../utils/axios.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { withTokenRefresh } from './api.js';

const axiosGroup = withTokenRefresh(axios.create({
    baseURL: import.meta.env.VITE_PASSENGER_URL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
}));

axiosGroup.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// GET /api/v1/groups — ADMIN ve todos, DRIVER ve los suyos
export const getGroups = () =>
    axiosGroup.get('/groups');

// GET /api/v1/groups/:id — incluye lista de pasajeros del grupo
export const getGroupById = (id) =>
    axiosGroup.get(`/groups/${id}`);

// POST /api/v1/groups — requiere DRIVER_ROLE
export const createGroup = (data) =>
    axiosGroup.post('/groups', data);

// PATCH /api/v1/groups/:id — dueño (DRIVER) o ADMIN
export const updateGroup = (id, data) =>
    axiosGroup.patch(`/groups/${id}`, data);

// DELETE /api/v1/groups/:id — dueño (DRIVER) o ADMIN
export const deleteGroup = (id) =>
    axiosGroup.delete(`/groups/${id}`);

// GET /api/v1/groups/limit/me — requiere DRIVER_ROLE
export const getMyGroupLimit = () =>
    axiosGroup.get('/groups/limit/me');

// GET /api/v1/groups/limit/:driverId — ADMIN o el propio conductor
export const getGroupLimit = (driverId) =>
    axiosGroup.get(`/groups/limit/${driverId}`);

// PUT /api/v1/groups/limit/:driverId — requiere ADMIN_ROLE
export const setGroupLimit = (driverId, maxGroups) =>
    axiosGroup.put(`/groups/limit/${driverId}`, { maxGroups });
