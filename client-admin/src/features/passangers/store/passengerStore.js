import { create } from 'zustand';
import { getPassengers, createPassenger, updatePassenger, updatePassengerStatus, setAbsenceReason, clearAbsenceReason, deletePassenger } from '../../../shared/api/passenger.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';

export const usePassengerStore = create((set, get) => ({
    passengers: [],
    loading:    false,
    error:      null,

    fetchPassengers: async () => {
        try {
            set({ loading: true, error: null });
            const { data } = await getPassengers();
            set({ passengers: data.data ?? [] });
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al cargar pasajeros';
            set({ error: msg });
            showError(msg);
        } finally {
            set({ loading: false });
        }
    },

    addPassenger: async (payload) => {
        try {
            set({ loading: true, error: null });
            const { data } = await createPassenger(payload);
            set((state) => ({ passengers: [...state.passengers, data.data] }));
            showSuccess('Pasajero creado correctamente');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al crear pasajero';
            set({ error: msg });
            showError(msg);
            return { success: false, error: msg };
        } finally {
            set({ loading: false });
        }
    },

    editPassenger: async (id, payload) => {
        const snapshot = get().passengers;
        set((state) => ({
            passengers: state.passengers.map((p) =>
                p._id === id ? { ...p, ...payload } : p
            ),
        }));
        try {
            set({ loading: true, error: null });
            const { data } = await updatePassenger(id, payload);
            set((state) => ({
                passengers: state.passengers.map((p) => (p._id === id ? data.data : p)),
            }));
            showSuccess('Pasajero actualizado');
            return { success: true };
        } catch (err) {
            set({ passengers: snapshot });
            const msg = err.response?.data?.message || 'Error al editar pasajero';
            set({ error: msg });
            showError(msg);
            return { success: false, error: msg };
        } finally {
            set({ loading: false });
        }
    },

    toggleStatus: async (id) => {
        const current = get().passengers.find((p) => p._id === id);
        if (!current) return;
        const newStatus = current.status === 'PRESENT' ? 'AUSENT' : 'PRESENT';
        set((state) => ({
            passengers: state.passengers.map((p) =>
                p._id === id ? { ...p, status: newStatus } : p
            ),
        }));
        try {
            await updatePassengerStatus(id, newStatus);
        } catch (err) {
            set((state) => ({
                passengers: state.passengers.map((p) =>
                    p._id === id ? { ...p, status: current.status } : p
                ),
            }));
            showError(err.response?.data?.message || 'Error al actualizar estado');
        }
    },

    setPassengerAbsenceReason: async (id, payload) => {
        try {
            const { data } = await setAbsenceReason(id, payload);
            set((state) => ({
                passengers: state.passengers.map((p) => (p._id === id ? data.data : p)),
            }));
            showSuccess('Motivo de ausencia registrado');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al registrar el motivo de ausencia';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    clearPassengerAbsenceReason: async (id) => {
        try {
            const { data } = await clearAbsenceReason(id);
            set((state) => ({
                passengers: state.passengers.map((p) => (p._id === id ? data.data : p)),
            }));
            showSuccess('Motivo de ausencia eliminado');
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al quitar el motivo de ausencia';
            showError(msg);
            return { success: false, error: msg };
        }
    },

    removePassenger: async (id) => {
        const snapshot = get().passengers;
        set((state) => ({ passengers: state.passengers.filter((p) => p._id !== id) }));
        try {
            await deletePassenger(id);
            showSuccess('Pasajero eliminado');
        } catch (err) {
            set({ passengers: snapshot });
            showError(err.response?.data?.message || 'Error al eliminar pasajero');
        }
    },

    getPresentCount: () => get().passengers.filter((p) => p.status === 'PRESENT').length,
    clearError:      () => set({ error: null }),
}));