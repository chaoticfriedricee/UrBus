// src/features/passengers/hooks/useMyStatus.js
import { useState, useCallback } from 'react';
import passengerClient from '../../../shared/api/passengerClient';
import { joinGroup as joinGroupRequest } from '../../../shared/api/groupApi';

export function useMyStatus() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notLinked, setNotLinked] = useState(false);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNotLinked(false);
        try {
        const response = await passengerClient.get('/passengers/me');
        const data = response.data.data ?? response.data;
        setStatus(data);
        } catch (err) {
        if (err.response?.status === 404) {
            setNotLinked(true);
        } else {
            setError(err.response?.data?.message ?? 'No se pudo cargar tu estado');
        }
        } finally {
        setLoading(false);
        }
    }, []);

    const toggleStatus = useCallback(async () => {
        if (!status) return;
        setLoading(true);
        setError(null);
        try {
            const nextStatus = status.status === 'PRESENT' ? 'AUSENT' : 'PRESENT';
            const passengerId = status._id ?? status.id;
            const response = await passengerClient.patch(`/passengers/${passengerId}/status`, { status: nextStatus });
            const data = response.data.data ?? response.data;
            setStatus(data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'No se pudo actualizar tu estado');
        } finally {
            setLoading(false);
        }
    }, [status]);

    const joinGroup = useCallback(async (code) => {
        setLoading(true);
        setError(null);
        try {
            const response = await joinGroupRequest(code);
            await fetchStatus();
            return { success: true, data: response.data?.data };
        } catch (err) {
            const msg = err.response?.data?.message ?? 'No se pudo unir al grupo';
            setError(msg);
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    }, [fetchStatus]);

    return { status, loading, error, notLinked, fetchStatus, toggleStatus, joinGroup };
}