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
    resetGroupLimit,
    getGroupSettings,
    updateGroupSettings,
    joinGroup,
} from '../../../shared/api/group.js';
import { getMyPassenger } from '../../../shared/api/passenger.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';

export const useGroupStore = create((set, get) => ({
    groups:       [],
    loading:      false,
    error:        null,
    // null hasta que responde /groups/limit/me
    myLimit:      null,
    // driverId -> { maxGroups, isCustom } (isCustom: límite propio en vez del general)
    driverLimits: {},
    defaultLimit: null,
    // Pasajero: su perfil con el grupo al que pertenece (groupId poblado)
    myPassenger:        null,
    myPassengerLoading: false,
    notLinked:          false,
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
            showError(msg);
            // El límite pudo cambiar (lo bajó un admin): se sincroniza el contador
            if (err.response?.data?.error === 'GROUP_LIMIT_REACHED') get().fetchMyLimit();
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
            if (err.response?.data?.error === 'GROUP_LIMIT_REACHED') get().fetchMyLimit();
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

    setDriverLimitFromResponse: (driverId, limit) => set((state) => ({
        driverLimits: {
            ...state.driverLimits,
            [driverId]: { maxGroups: limit?.maxGroups ?? 0, isCustom: Boolean(limit?.isCustom) },
        },
    })),

    fetchDriverLimit: async (driverId) => {
        try {
            const { data } = await getGroupLimit(driverId);
            get().setDriverLimitFromResponse(driverId, data.data);
        } catch (err) {
            showError(err.response?.data?.message || 'Error al cargar el límite del conductor');
        }
    },

    updateDriverLimit: async (driverId, maxGroups) => {
        try {
            const { data } = await setGroupLimit(driverId, maxGroups);
            get().setDriverLimitFromResponse(driverId, data.data);
            showSuccess('Límite de grupos actualizado');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al actualizar el límite';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    resetDriverLimit: async (driverId) => {
        try {
            const { data } = await resetGroupLimit(driverId);
            get().setDriverLimitFromResponse(driverId, data.data);
            showSuccess('El conductor usa ahora el límite general');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al restablecer el límite';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    fetchDefaultLimit: async () => {
        try {
            const { data } = await getGroupSettings();
            set({ defaultLimit: data.data?.maxGroupsPerDriver ?? null });
        } catch (err) {
            showError(err.response?.data?.message || 'Error al cargar el límite general');
        }
    },

    updateDefaultLimit: async (maxGroupsPerDriver) => {
        try {
            const { data } = await updateGroupSettings({ maxGroupsPerDriver });
            set((state) => ({
                defaultLimit: data.data?.maxGroupsPerDriver,
                // Los conductores sin límite propio pasan a usar el nuevo valor
                driverLimits: Object.fromEntries(
                    Object.entries(state.driverLimits).map(([id, limit]) => [
                        id,
                        limit.isCustom ? limit : { ...limit, maxGroups: data.data?.maxGroupsPerDriver },
                    ])
                ),
            }));
            showSuccess('Límite general de grupos actualizado');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al actualizar el límite general';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    fetchMyPassenger: async () => {
        try {
            set({ myPassengerLoading: true, notLinked: false });
            const { data } = await getMyPassenger();
            set({ myPassenger: data.data ?? null });
        } catch (err) {
            if (err.response?.status === 404) {
                set({ myPassenger: null, notLinked: true });
            } else {
                showError(err.response?.data?.message || 'Error al cargar tu grupo');
            }
        } finally {
            set({ myPassengerLoading: false });
        }
    },

    joinGroupByCode: async (code) => {
        try {
            const { data } = await joinGroup(code);
            await get().fetchMyPassenger();
            return { success: true, group: data.data?.group };
        } catch (err) {
            const msg = err.response?.data?.message || 'No se pudo unir al grupo';
            return { success: false, error: msg };
        }
    },

    getActiveCount: () => get().groups.filter((g) => g.isActive).length,
    clearError: () => set({ error: null }),
}));
