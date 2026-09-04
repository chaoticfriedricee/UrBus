import { create } from 'zustand';
import {
    getGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    getMyGroupLimit,
    getGroupLimit,
    setGroupLimit,
} from '../../../shared/api/group.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';

export const useGroupStore = create((set, get) => ({
    groups:       [],
    loading:      false,
    error:        null,
    myLimit:      0,
    driverLimits: {},
    activeGroup:  null,
    activeLoading: false,

    fetchGroups: async () => {
        try {
            set({ loading: true, error: null });
            const { data } = await getGroups();
            set({ groups: data.data ?? [] });
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al cargar grupos';
            set({ error: msg });
            showError(msg);
        } finally {
            set({ loading: false });
        }
    },

    fetchGroupDetail: async (id) => {
        try {
            set({ activeLoading: true });
            const { data } = await getGroupById(id);
            set({ activeGroup: data.data });
        } catch (err) {
            showError(err.response?.data?.message || 'Error al cargar el grupo');
        } finally {
            set({ activeLoading: false });
        }
    },

    clearActiveGroup: () => set({ activeGroup: null }),

    addGroup: async (payload) => {
        try {
            set({ loading: true, error: null });
            const { data } = await createGroup(payload);
            set((state) => ({ groups: [{ ...data.data, passengerCount: 0 }, ...state.groups] }));
            showSuccess('Grupo creado correctamente');
            return { success: true, data: data.data };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al crear grupo';
            set({ error: msg });
            showError(msg);
            return { success: false, error: msg };
        } finally {
            set({ loading: false });
        }
    },

    editGroup: async (id, payload) => {
        const snapshot = get().groups;
        set((state) => ({
            groups: state.groups.map((g) => (g._id === id ? { ...g, ...payload } : g)),
        }));
        try {
            await updateGroup(id, payload);
            showSuccess('Grupo actualizado');
            return { success: true };
        } catch (err) {
            set({ groups: snapshot });
            const msg = err.response?.data?.message || 'Error al editar grupo';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    toggleGroupActive: async (id) => {
        const current = get().groups.find((g) => g._id === id);
        if (!current) return;
        return get().editGroup(id, { isActive: !current.isActive });
    },

    removeGroup: async (id) => {
        const snapshot = get().groups;
        set((state) => ({ groups: state.groups.filter((g) => g._id !== id) }));
        try {
            await deleteGroup(id);
            showSuccess('Grupo eliminado');
        } catch (err) {
            set({ groups: snapshot });
            showError(err.response?.data?.message || 'Error al eliminar grupo');
        }
    },

    fetchMyLimit: async () => {
        try {
            const { data } = await getMyGroupLimit();
            set({ myLimit: data.data?.maxGroups ?? 0 });
        } catch (err) {
            showError(err.response?.data?.message || 'Error al cargar el límite de grupos');
        }
    },

    fetchDriverLimit: async (driverId) => {
        try {
            const { data } = await getGroupLimit(driverId);
            set((state) => ({
                driverLimits: { ...state.driverLimits, [driverId]: data.data?.maxGroups ?? 0 },
            }));
        } catch (err) {
            showError(err.response?.data?.message || 'Error al cargar el límite del conductor');
        }
    },

    updateDriverLimit: async (driverId, maxGroups) => {
        const snapshot = get().driverLimits[driverId];
        set((state) => ({ driverLimits: { ...state.driverLimits, [driverId]: maxGroups } }));
        try {
            await setGroupLimit(driverId, maxGroups);
            showSuccess('Límite de grupos actualizado');
            return { success: true };
        } catch (err) {
            set((state) => ({ driverLimits: { ...state.driverLimits, [driverId]: snapshot } }));
            const msg = err.response?.data?.message || 'Error al actualizar el límite';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    getActiveCount: () => get().groups.filter((g) => g.isActive).length,
    clearError: () => set({ error: null }),
}));
