// src/features/passengers/hooks/useMyStatus.js
import { useState, useCallback } from 'react';
import passengerClient from '../../../shared/api/passengerClient';
import { joinGroup as joinGroupRequest } from '../../../shared/api/groupApi';
import { getPassengers } from '../../../shared/api/passengerApi';

export function useMyStatus() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notLinked, setNotLinked] = useState(false);
    // Compañeros del grupo: passenger-service solo devuelve los de tu grupo activo (nombre)
    const [groupMates, setGroupMates] = useState([]);

    const fetchGroupMates = useCallback(async () => {
        try {
            const response = await getPassengers();
            const data = response.data.data ?? response.data;
            setGroupMates(Array.isArray(data) ? data : []);
        } catch {
            setGroupMates([]);
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNotLinked(false);
        try {
        const response = await passengerClient.get('/passengers/me');
        const data = response.data.data ?? response.data;
        setStatus(data);
        if (data?.groupId?.isActive) await fetchGroupMates();
        else setGroupMates([]);
        } catch (err) {
        if (err.response?.status === 404) {
            setNotLinked(true);
        } else {
            setError(err.response?.data?.message ?? 'No se pudo cargar tu estado');
        }
        } finally {
        setLoading(false);
        }
    }, [fetchGroupMates]);

    const joinGroup = useCallback(async (code) => {
        setLoading(true);
        try {
            const response = await joinGroupRequest(code);
            await fetchStatus();
            return { success: true, message: response.data?.message, data: response.data?.data };
        } catch (err) {
            const msg = err.response?.data?.message ?? 'No se pudo unir al grupo';
            return { success: false, error: msg };
        } finally {
            setLoading(false);
        }
    }, [fetchStatus]);

    return { status, loading, error, notLinked, groupMates, fetchStatus, joinGroup };
}