import { axiosAuth } from "./api";

// POST /api/v1/auth/login
export const login = async (data) => {
    return await axiosAuth.post('/auth/login', data);
};

// POST /api/v1/auth/register  (multipart/form-data)
export const register = async (data) => {
    // `data` ya llega como FormData construido en Register.jsx.
    // No lo reconstruyas con Object.entries(data): un FormData no es un
    // objeto plano enumerable, así que Object.entries(FormData) devuelve []
    // y el payload se manda vacío. Si en algún otro lugar se llama a esta
    // función con un objeto plano, esta rama lo convierte a FormData;
    // si ya es FormData, se reenvía tal cual.
    const formData = data instanceof FormData
        ? data
        : Object.entries(data).reduce((fd, [key, value]) => {
            if (value !== undefined && value !== null) fd.append(key, value);
            return fd;
        }, new FormData());

    // No fuerces el header Content-Type aquí: axios detecta que formData
    // es una instancia de FormData y agrega automáticamente
    // "multipart/form-data; boundary=..." con el boundary correcto.
    return await axiosAuth.post('/auth/register', formData);
};

// POST /api/v1/auth/verify-email
export const verifyEmail = async (token) => {
    return await axiosAuth.post('/auth/verify-email', { token });
};

// POST /api/v1/auth/resend-verification
export const resendVerification = async (email) => {
    return await axiosAuth.post('/auth/resend-verification', { email });
};

// POST /api/v1/auth/forgot-password
export const forgotPassword = async (email) => {
    return await axiosAuth.post('/auth/forgot-password', { email });
};

// POST /api/v1/auth/reset-password
export const resetPassword = async (token, newPassword) => {
    return await axiosAuth.post('/auth/reset-password', { token, newPassword });
};