// src/shared/api/userApi.js
// Gestión de cuentas en el servicio de autenticación (mismos endpoints que
// client-admin/src/shared/api/users.js)
import authClient from './authClient';

// GET /users — requiere ADMIN_ROLE
export const getAllUsers = () => authClient.get('/users');

// GET /users/:userId — ADMIN o DRIVER: datos de contacto de una cuenta
export const getUserById = (userId) => authClient.get(`/users/${userId}`);

// PUT /users/:userId/role?roleName=... — requiere ADMIN_ROLE
export const updateUserRole = (userId, roleName) =>
  authClient.put(`/users/${userId}/role`, {}, { params: { roleName } });

// PUT /users/:userId/verify-email — requiere ADMIN_ROLE (verificación manual del correo)
export const verifyUserEmail = (userId) => authClient.put(`/users/${userId}/verify-email`);
