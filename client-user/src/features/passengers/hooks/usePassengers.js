// src/features/passengers/hooks/usePassengers.js
// Gestión de la lista de pasajeros — función portada de client-admin
// (features/passangers/store/passengerStore.js). Disponible para DRIVER_ROLE y
// ADMIN_ROLE; el toggle de estado solo lo pueden usar ellos (no el pasajero).
import { useState, useCallback } from 'react';
import { getPassengers, createPassenger, updatePassengerStatus, deletePassenger } from '../../../shared/api/passengerApi';

export function usePassengers() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPassengers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPassengers();
      const data = response.data.data ?? response.data;
      setPassengers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudieron cargar los pasajeros');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleStatus = useCallback(async (id, currentStatus) => {
    const newStatus = currentStatus === 'PRESENT' ? 'AUSENT' : 'PRESENT';
    setPassengers((prev) => prev.map((p) => (p._id === id ? { ...p, status: newStatus } : p)));
    try {
      await updatePassengerStatus(id, newStatus);
    } catch (err) {
      setPassengers((prev) => prev.map((p) => (p._id === id ? { ...p, status: currentStatus } : p)));
      setError(err.response?.data?.message ?? 'No se pudo actualizar el estado');
    }
  }, []);

  const addPassenger = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createPassenger(payload);
      const data = response.data.data ?? response.data;
      setPassengers((prev) => [...prev, data]);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message ?? 'No se pudo crear el pasajero';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const removePassenger = useCallback(async (id) => {
    const snapshot = passengers;
    setPassengers((prev) => prev.filter((p) => p._id !== id));
    try {
      await deletePassenger(id);
      return { success: true };
    } catch (err) {
      setPassengers(snapshot);
      setError(err.response?.data?.message ?? 'No se pudo eliminar el pasajero');
      return { success: false };
    }
  }, [passengers]);

  const presentCount = passengers.filter((p) => p.status === 'PRESENT').length;

  return { passengers, loading, error, presentCount, fetchPassengers, toggleStatus, addPassenger, removePassenger };
}