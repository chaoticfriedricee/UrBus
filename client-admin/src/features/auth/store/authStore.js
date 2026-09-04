import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginRequest, register as registerRequest } from '../../../shared/api/auth.js';
import { updateProfile as updateProfileRequest } from '../../../shared/api/profile.js';
import { showError } from '../../../shared/utils/toast.js';

const ALLOWED_ROLES = ['ADMIN_ROLE', 'USER_ROLE', 'PASSENGER_ROLE', 'DRIVER_ROLE'];

export const useAuthStore = create(
    persist(
        (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        expiresAt: null,
        loading: false,
        error: null,
        isLoadingAuth: true,
        isAuthenticated: false,

        setUser: (updatedUser) => set({ user: updatedUser }),

        checkAuth: () => {
            const token = get().token;
            const role = get().user?.role;
            const hasValidRole = ALLOWED_ROLES.includes(role);

            if (token && !hasValidRole) {
                set({
                    user: null,
                    token: null,
                    refreshToken: null,
                    expiresAt: null,
                    isAuthenticated: false,
                    isLoadingAuth: false,
                    loading: false,
                    error: 'No tienes permisos para acceder a esta aplicación',
                });
                return;
            }

            set({
                isLoadingAuth: false,
                loading: false,
                isAuthenticated: Boolean(token) && hasValidRole,
            });
        },

        logout: () => {
            set({
                user: null,
                token: null,
                refreshToken: null,
                expiresAt: null,
                isAuthenticated: false,
                isLoadingAuth: false,
                loading: false,
            });
        },

        login: async ({ emailOrUsername, password }) => {
            try {
                set({ loading: true, error: null });
                const { data } = await loginRequest({ emailOrUsername, password });
                const role = data?.userDetails?.role;

                if (!ALLOWED_ROLES.includes(role)) {
                    const message = 'No tienes permisos para acceder a esta aplicación';
                    set({ user: null, token: null, refreshToken: null, expiresAt: null,
                        isAuthenticated: false, isLoadingAuth: false, error: message, loading: false });
                    showError(message);
                    return { success: false, error: message };
                }

                set({ user: data.userDetails, token: data.token, refreshToken: data.refreshToken,
                    expiresAt: data.expiresAt, isAuthenticated: true, isLoadingAuth: false,
                    loading: false, error: null });
                return { success: true, role };
            } catch (err) {
                const status = err.response?.status;
                const serverMsg = err.response?.data?.message;

                const message =
                    status === 401 ? 'Correo/usuario o contraseña incorrectos.' :
                    status === 403 ? 'Tu cuenta no tiene permiso para ingresar.' :
                    status === 404 ? 'El usuario no existe.' :
                    status === 423 ? 'Tu cuenta está bloqueada. Contacta al administrador.' :
                    status === 429 ? 'Demasiados intentos. Espera unos minutos.' :
                    serverMsg || 'Error al iniciar sesión. Intenta de nuevo.';

                set({ error: message, loading: false });
                showError(message);
                return { success: false, error: message };
            }
        },

        register: async (formData) => {
            try {
                set({ loading: true, error: null });
                const { data } = await registerRequest(formData);
                set({ loading: false });
                return {
                    success: true,
                    emailVerificationRequired: data?.emailVerificationRequired ?? true,
                    data,
                };
            } catch (err) {
                if (err.response?.status === 429) {
                    const message = 'Demasiados intentos. Espera un minuto antes de volver a intentar.';
                    set({ error: message, loading: false });
                    showError(message);
                    return { success: false, error: message };
                }

                // El backend manda { message: 'Invalid Arguments', errors: [{field, message}] }
                // cuando falla la validación de campos. Si no mostramos "errors", el usuario
                // (y nosotros) solo vemos el mensaje genérico "Invalid Arguments" y no hay
                // forma de saber qué campo está mal sin abrir DevTools.
                const fieldErrors = err.response?.data?.errors;
                const message =
                    (Array.isArray(fieldErrors) && fieldErrors.length > 0
                        ? fieldErrors.map((e) => e.message).join(' | ')
                        : null) ||
                    err.response?.data?.message ||
                    'Error al registrar usuario';
                set({ error: message, loading: false });
                return { success: false, error: message };
            }
        },

        updateProfile: async (userId, formData) => {
            try {
                set({ loading: true, error: null });
                const { data } = await updateProfileRequest(userId, formData);
                const currentUser = get().user;
                const updatedUser = {
                    ...currentUser,
                    name: data.name ?? currentUser?.name,
                    surname: data.surname ?? currentUser?.surname,
                    phone: data.phone ?? currentUser?.phone,
                    profilePicture: data.profilePicture ?? currentUser?.profilePicture,
                    role: data.role ?? currentUser?.role,
                    updatedAt: data.updatedAt ?? currentUser?.updatedAt,
                };

                set({ user: updatedUser, loading: false, error: null });
                return { success: true, data: updatedUser };
            } catch (err) {
                const message = err.response?.data?.message || 'Error al actualizar el perfil';
                set({ error: message, loading: false });
                showError(message);
                return { success: false, error: message };
            }
        },
        }),
        { name: 'auth-UB-store' }
    )
);