import { useState, useEffect, useRef } from 'react';
import { verifyEmail as verifyEmailRequest } from '../../../shared/api';
import { showError, showSuccess } from '../../../shared/utils/toast.js';

export const useVerifyEmail = (token, onFinish) => {
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

    // Evita doble ejecución en StrictMode
    const hasVerified = useRef(false);

    useEffect(() => {
        const run = async () => {
            if (hasVerified.current) return;
            hasVerified.current = true;

            if (!token) {
                setStatus('error');
                setMessage('Token inválido.');
                showError('Token inválido.');
                if (onFinish) onFinish();
                return;
            }

            try {
                const response = await verifyEmailRequest(token);
                // El backend responde 200 con success:false si el token es inválido o expiró
                if (response.status === 200 && response.data?.success) {
                    setStatus('success');
                    setMessage('Tu correo ha sido verificado correctamente.');
                    showSuccess('¡Correo verificado correctamente!');
                } else {
                    setStatus('error');
                    setMessage('El enlace ha expirado o no es válido.');
                    showError('El enlace ha expirado o no es válido.');
                }
            } catch {
                setStatus('error');
                setMessage('El enlace ha expirado o no es válido.');
                showError('El enlace ha expirado o no es válido.');
            } finally {
                if (onFinish) onFinish();
            }
        };

        run();
    }, [token, onFinish]);

    return { status, message };
};