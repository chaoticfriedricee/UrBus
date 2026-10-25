// src/features/auth/hooks/useAuth.js
import { useState, useCallback } from 'react';
import authClient from '../../../shared/api/authClient';
import useAuthStore from '../../../shared/store/authStore';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const storeLogin = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);

  const handleLogin = useCallback(
    async ({ emailOrUsername, password }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await authClient.post('/auth/login', {
          emailOrUsername,
          password,
        });
        const { token, refreshToken, expiresAt, userDetails } = response.data;

        try {
          storeLogin(token, refreshToken, expiresAt, userDetails);
        } catch (permissionError) {
          setError(permissionError.message);
          return { success: false };
        }

        return { success: true };
      } catch (err) {
        setError(err.response?.data?.message ?? 'No se pudo iniciar sesión');
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [storeLogin]
  );

  const handleRegister = useCallback(async (formValues) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('name', formValues.name);
      formData.append('surname', formValues.surname);
      formData.append('username', formValues.username);
      formData.append('email', formValues.email);
      formData.append('password', formValues.password);
      formData.append('phone', formValues.phone);
      if (formValues.profilePicture) {
        formData.append('profilePicture', formValues.profilePicture);
      }

      const response = await authClient.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { success, user, message, emailVerificationRequired } = response.data;
      return { success, user, message, emailVerificationRequired };
    } catch (err) {
      // Si falla la validación el backend responde { message: 'Invalid Arguments', errors: [{ field, message }] }
      const fieldErrors = err.response?.data?.errors;
      const message =
        (Array.isArray(fieldErrors) && fieldErrors.length > 0
          ? fieldErrors.map((e) => e.message).join('\n')
          : null) ??
        err.response?.data?.message ??
        'No se pudo completar el registro';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { handleLogin, handleRegister, loading, error, logout: storeLogout };
}
