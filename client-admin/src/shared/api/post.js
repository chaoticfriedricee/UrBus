import axios from '../utils/axios.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { withTokenRefresh } from './api.js';

const axiosPost = withTokenRefresh(axios.create({
    baseURL: import.meta.env.VITE_POST_URL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
}));

axiosPost.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const getPosts = () =>
    axiosPost.get('/posts');

export const getMyPosts = () =>
    axiosPost.get('/posts/my-posts');

export const getPostById = (id) =>
    axiosPost.get(`/posts/${id}`);

export const createPost = (formData) =>
    axiosPost.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updatePost = (id, formData) =>
    axiosPost.put(`/posts/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deletePost = (id) =>
    axiosPost.delete(`/posts/${id}`);

export const reactivatePost = (id) =>
    axiosPost.patch(`/posts/${id}/reactivate`);