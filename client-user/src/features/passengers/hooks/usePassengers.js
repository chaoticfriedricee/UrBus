// src/features/passengers/hooks/usePassengers.js
// Gestión de la lista de pasajeros — función portada de client-admin
// (features/passangers/store/passengerStore.js). Disponible para DRIVER_ROLE y
// ADMIN_ROLE; el toggle de estado solo lo pueden usar ellos (no el pasajero).
import { useState, useCallback, useRef } from 'react';
import {
  getPassengers, createPassenger, updatePassenger, updatePassengerStatus, setAbsenceReason, clearAbsenceReason, deletePassenger,
} from '../../../shared/api/passengerApi';

export function usePassengers() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Al cambiar de grupo rápido, solo se aplica la respuesta de la última petición
  const lastRequest = useRef(0);

  // groupId opcional: solo los pasajeros de ese grupo. Devuelve el status HTTP del
  // error para que la pantalla pueda volver a "Todos" si el grupo ya no existe
  const fetchPassengers = useCallback(async (groupId = null) => {
    const requestId = ++lastRequest.current;
    const isLatest = () => requestId === lastRequest.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getPassengers(groupId);
      const data = response.data.data ?? response.data;
      if (isLatest()) setPassengers(Array.isArray(data) ? data : []);
      return { success: true };
    } catch (err) {
      if (isLatest()) setError(err.response?.data?.message ?? 'No se pudieron cargar los pasajeros');
      return { success: false, status: err.response?.status };
    } finally {
      if (isLatest()) setLoading(false);
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

  // El servidor devuelve el pasajero actualizado; se reemplaza en la lista
  const replaceWith = useCallback(async (request, fallback) => {
    try {
      const response = await request();
      const updated = response.data.data ?? response.data;
      setPassengers((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message ?? fallback };
    }
  }, []);

  const editPassenger = useCallback(
    (id, name) => replaceWith(() => updatePassenger(id, { name }), 'No se pudo editar el pasajero'),
    [replaceWith]
  );

  // Registrar un motivo marca al pasajero como ausente (lo hace passenger-service)
  const saveAbsenceReason = useCallback(
    (id, reason, note) => replaceWith(() => setAbsenceReason(id, { reason, note }), 'No se pudo registrar el motivo de ausencia'),
    [replaceWith]
  );

  const removeAbsenceReason = useCallback(
    (id) => replaceWith(() => clearAbsenceReason(id), 'No se pudo quitar el motivo de ausencia'),
    [replaceWith]
  );

  const presentCount = passengers.filter((p) => p.status === 'PRESENT').length;

  return {
    passengers, loading, error, presentCount, fetchPassengers, toggleStatus, addPassenger, removePassenger,
    editPassenger, saveAbsenceReason, removeAbsenceReason,
  };
}