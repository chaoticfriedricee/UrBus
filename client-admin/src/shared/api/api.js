import axios from '../utils/axios.js';

// authStore.js NO se importa de forma estática aquí a propósito: authStore.js
// (y otros módulos que pasan por el barrel shared/api/index.js) terminan
// importando de vuelta este archivo, formando un ciclo. Un import estático
// aquí + un "export *" en el barrel en medio del ciclo hace que el enlazador
// de módulos ESM a veces no resuelva "axiosAuth" a tiempo
// (SyntaxError: does not provide an export named 'axiosAuth').
// Cargarlo de forma diferida (dynamic import) rompe el ciclo por completo.
let _authStorePromise = null;
function getAuthStore() {
    if (!_authStorePromise) {
        _authStorePromise = import('../../features/auth/store/authStore.js').then((m) => m.useAuthStore);
    }
    return _authStorePromise;
}

const axiosAuth = axios.create({
    baseURL: import.meta.env.VITE_AUTH_URL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
});

const axiosAdmin = axios.create({
    baseURL: import.meta.env.VITE_AUTH_URL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
});

axiosAuth.interceptors.request.use(async (config) => {
    const useAuthStore = await getAuthStore();
    const token = useAuthStore.getState().token;
    config._axiosClient = 'auth';

    if(token) config.headers.Authorization = `Bearer ${token}`;

    return config;
});

axiosAdmin.interceptors.request.use(async (config) => {
    const useAuthStore = await getAuthStore();
    const token = useAuthStore.getState().token;
    config._axiosClient = 'admin';

    if(token) config.headers.Authorization = `Bearer ${token}`;

    return config;
});

// --- Lógica para refreshToken-service ---
let _isRefreshing = false;
let failedQueue = [];

function _processQueue(_error, token = null) {
    failedQueue.forEach(({ resolve, reject }) => (_error ? reject(_error) : resolve(token)));
    failedQueue = [];
}

const handleRefreshToken = async function (_error) {
    const _original = _error.config;

    if(!_original || _original._retry){
        return Promise.reject(_error);
    }

    const useAuthStore = await getAuthStore();
    const status = _error.response?.status;
    const errorCode = _error.response?.data?.error;
    const requestUrl = _original.url || '';
    const isRefreshEndpoint = requestUrl.includes(`/auth/refresh`) || requestUrl.includes(`/auth/login`) || requestUrl.includes(`/auth/register`);
    const shouldAttemptRefresh = !isRefreshEndpoint && status === 401;
    const shouldAttemptRefreshFrom403 = !isRefreshEndpoint && status === 403 && errorCode === 'TOKEN_EXPIRED';
    const shouldRefresh = shouldAttemptRefresh || shouldAttemptRefreshFrom403;

    if(shouldRefresh){
        const retryClient = _original._axiosClient === 'admin' ? axiosAdmin : axiosAuth;

        if(_isRefreshing){
            return new Promise(function (resolve, reject) {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                _original.headers['Authorization'] = 'Bearer ' + token;

                return retryClient(_original);
            }).catch((err) => Promise.reject(err));
        }

        _original._retry = true;
        _isRefreshing = true;

        const refreshToken = useAuthStore.getState().refreshToken;

        if(!refreshToken){
            useAuthStore.getState().logout();

            return Promise.reject(_error);
        }

        try{
            const response = await axiosAuth.post('/auth/refresh', { refreshToken });
            const { token, refreshToken: newRefreshToken, expiresAt, userDetails } = response.data;

            useAuthStore.setState({
                token: token,
                refreshToken: newRefreshToken,
                expiresAt: expiresAt,
                user: userDetails || useAuthStore.getState().user,
                isAuthenticated: true,
            });

            _processQueue(null, token);
            _original.headers['Authorization'] = 'Bearer ' + token;

            return retryClient(_original);
        }catch(err){
            _processQueue(err, null);
            useAuthStore.getState().logout();
            return Promise.reject(err);
        }finally{
            _isRefreshing = false;
        }
    }

    return Promise.reject(_error);
}

axiosAuth.interceptors.response.use((res) => res, handleRefreshToken);
axiosAdmin.interceptors.response.use((res) => res, handleRefreshToken);

// ------

export { axiosAuth, axiosAdmin };