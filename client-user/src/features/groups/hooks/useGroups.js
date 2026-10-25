// src/features/groups/hooks/useGroups.js
// Gestión de grupos — misma función que client-admin (features/groups/store/groupStore.js).
// DRIVER_ROLE gestiona sus grupos dentro de su límite; ADMIN_ROLE ve y gestiona todos.
import { useState, useCallback } from 'react';
import {
  getGroups, createGroup, updateGroup, deleteGroup, getMyGroupLimit,
} from '../../../shared/api/groupApi';

const messageOf = (err, fallback) => err.response?.data?.message ?? fallback;

export function useGroups({ isDriver }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // null hasta que responde /groups/limit/me (solo conductores)
  const [myLimit, setMyLimit] = useState(null);

  const fetchMyLimit = useCallback(async () => {
    if (!isDriver) return;
    try {
      const response = await getMyGroupLimit();
      setMyLimit(response.data.data?.maxGroups ?? 0);
    } catch {
      setMyLimit(null);
    }
  }, [isDriver]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getGroups();
      const data = response.data.data ?? response.data;
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(messageOf(err, 'No se pudieron cargar los grupos'));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => Promise.all([fetchGroups(), fetchMyLimit()]), [fetchGroups, fetchMyLimit]);

  // Si el servidor rechaza por límite, se sincroniza el contador (un admin pudo bajarlo)
  const handleLimitError = useCallback((err) => {
    if (err.response?.data?.error === 'GROUP_LIMIT_REACHED') fetchMyLimit();
  }, [fetchMyLimit]);

  const addGroup = useCallback(async (name) => {
    try {
      const response = await createGroup({ name });
      const group = response.data.data;
      setGroups((prev) => [{ ...group, passengerCount: 0 }, ...prev]);
      return { success: true, group };
    } catch (err) {
      handleLimitError(err);
      return { success: false, message: messageOf(err, 'No se pudo crear el grupo') };
    }
  }, [handleLimitError]);

  const editGroup = useCallback(async (id, payload) => {
    try {
      const response = await updateGroup(id, payload);
      const updated = response.data.data;
      setGroups((prev) => prev.map((g) => (g._id === id ? { ...g, ...updated } : g)));
      return { success: true };
    } catch (err) {
      handleLimitError(err);
      return { success: false, message: messageOf(err, 'No se pudo actualizar el grupo') };
    }
  }, [handleLimitError]);

  const toggleActive = useCallback((group) => editGroup(group._id, { isActive: !group.isActive }), [editGroup]);

  const removeGroup = useCallback(async (id) => {
    try {
      await deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: messageOf(err, 'No se pudo eliminar el grupo') };
    }
  }, []);

  const activeCount = groups.filter((g) => g.isActive).length;

  return {
    groups, loading, error, myLimit, activeCount,
    fetchGroups, refresh, addGroup, editGroup, toggleActive, removeGroup,
  };
}
