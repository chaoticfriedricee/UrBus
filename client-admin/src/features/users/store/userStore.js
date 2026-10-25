import { create } from 'zustand';
import { getAllUsers, updateUserRole, verifyUserEmail } from '../../../shared/api/users.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';

export const useUserStore = create((set, get) => ({
    users:   [],
    loading: false,
    error:   null,

    fetchUsers: async () => {
        try {
            set({ loading: true, error: null });
            const { data } = await getAllUsers();
            set({ users: Array.isArray(data) ? data : (data?.data ?? []) });
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al cargar usuarios';
            set({ error: msg });
            showError(msg);
        } finally {
            set({ loading: false });
        }
    },

    changeUserRole: async (userId, roleName) => {
        const snapshot = get().users;
        set((state) => ({
            users: state.users.map((u) =>
                u.id === userId ? { ...u, role: roleName } : u
            ),
        }));
        try {
            const { data: updated } = await updateUserRole(userId, roleName);
            set((state) => ({
                users: state.users.map((u) => (u.id === userId ? { ...u, ...updated } : u)),
            }));
            showSuccess('Rol actualizado correctamente');
            return { success: true };
        } catch (err) {
            set({ users: snapshot });
            const msg = err.response?.data?.message || 'Error al actualizar el rol';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    verifyEmail: async (userId) => {
        try {
            const { data: updated } = await verifyUserEmail(userId);
            set((state) => ({
                users: state.users.map((u) => (u.id === userId ? { ...u, ...updated } : u)),
            }));
            showSuccess('Email verificado correctamente');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al verificar el email';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    clearError: () => set({ error: null }),
}));