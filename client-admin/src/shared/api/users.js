import { axiosAuth } from './api';

// GET /api/v1/users — requiere ADMIN_ROLE
export const getAllUsers = async () => {
    return await axiosAuth.get('/users');
};

// GET /api/v1/users/:userId — requiere ADMIN_ROLE o DRIVER_ROLE
// Info de contacto de una cuenta (nombre, teléfono, email, fecha de creación, etc.)
export const getUserById = async (userId) => {
    return await axiosAuth.get(`/users/${userId}`);
};

// PUT /api/v1/users/:userId/role?roleName=... — requiere ADMIN_ROLE
export const updateUserRole = async (userId, roleName) => {
    return await axiosAuth.put(`/users/${userId}/role`, {}, {
        params: { roleName },
    });
};

// PUT /api/v1/users/:userId/passenger-type — requiere ADMIN_ROLE
// Tipo de pasajero (fijo, eventual); no cambia el rol ni los permisos
export const updatePassengerType = async (userId, passengerType) => {
    return await axiosAuth.put(`/users/${userId}/passenger-type`, { passengerType });
};

// PUT /api/v1/users/:userId/verify-email — requiere ADMIN_ROLE
// Verificación manual del email, alternativa al envío por SMTP (que no funciona en Render)
export const verifyUserEmail = async (userId) => {
    return await axiosAuth.put(`/users/${userId}/verify-email`);
};