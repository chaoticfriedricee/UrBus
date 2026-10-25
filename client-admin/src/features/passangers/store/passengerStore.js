import { create } from 'zustand';
import { getPassengers, createPassenger, updatePassenger, updatePassengerStatus, setAbsenceReason, clearAbsenceReason, deletePassenger } from '../../../shared/api/passenger.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';

// El grupo elegido se recuerda en este navegador para no volver a elegirlo en cada visita
const SELECTED_GROUP_KEY = 'urbus.passengers.selectedGroupId';

const readSelectedGroup = () => {
    try {
        return localStorage.getItem(SELECTED_GROUP_KEY) || null;
    } catch {
        return null;
    }
};

const saveSelectedGroup = (groupId) => {
    try {
        if (groupId) localStorage.setItem(SELECTED_GROUP_KEY, groupId);
        else localStorage.removeItem(SELECTED_GROUP_KEY);
    } catch {
        // sin almacenamiento disponible: la elección dura solo esta sesión
    }
};

export const usePassengerStore = create((set, get) => ({
    passengers: [],
    loading:    false,
    error:      null,
    // null = todos los pasajeros; si no, el _id del grupo que se está viendo
    selectedGroupId: readSelectedGroup(),

    fetchPassengers: async () => {
        const groupId = get().selectedGroupId;
        try {
            set({ loading: true, error: null });
            const { data } = await getPassengers(groupId);
            // Si el grupo cambió mientras cargaba, esta respuesta ya no aplica
            if (get().selectedGroupId !== groupId) return;
            set({ passengers: data.data ?? [] });
        } catch (err) {
            const status = err.response?.status;
            // El grupo recordado ya no existe o no es del usuario: se vuelve a "Todos"
            if (groupId && (status === 403 || status === 404 || status === 400)) {
                get().selectGroup(null);
                return;
            }
            const msg = err.response?.data?.message || 'Error al cargar pasajeros';
            set({ error: msg });
            showError(msg);
        } finally {
            if (get().selectedGroupId === groupId) set({ loading: false });
        }
    },

    selectGroup: (groupId) => {
        saveSelectedGroup(groupId);
        set({ selectedGroupId: groupId, passengers: [] });
        return get().fetchPassengers();
    },

    addPassenger: async (payload) => {
        try {
            set({ loading: true, error: null });
            const { data } = await createPassenger(payload);
            // Un pasajero nuevo no tiene grupo: solo aparece en la vista "Todos"
            if (!get().selectedGroupId) {
                set((state) => ({ passengers: [...state.passengers, data.data] }));
            }
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