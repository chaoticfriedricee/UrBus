// src/features/posts/hooks/usePosts.js
import { useState, useCallback } from 'react';
import {
  getPosts, getMyPosts, getPostById, createPost, updatePost, deletePost, reactivatePost,
} from '../../../shared/api/postApi';

function mapPost(raw) {
  return {
    id: raw._id,
    title: raw.title,
    content: raw.content,
    image: raw.imageUrl ?? null,
    createdAt: raw.createdAt,
    createdBy: raw.createdBy,
    // null = aviso general; si no, el grupo al que va dirigido
    groupId: raw.groupId ?? null,
    isDeleted: raw.isDeleted ?? false,
    isUrgent: raw.isUrgent ?? false,
  };
}

/**
 * Feed de anuncios. Para DRIVER_ROLE/ADMIN_ROLE incluye además las acciones de
 * creación, edición, eliminación y reactivación — funciones portadas de
 * client-admin (features/post/store/postStore.js).
 */
export function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async (mine = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = mine ? await getMyPosts() : await getPosts();
      const data = response.data.data ?? response.data;
      setPosts(Array.isArray(data) ? data.map(mapPost) : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudieron cargar los anuncios');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPost = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createPost(formData);
      const raw = response.data.post ?? response.data.data ?? response.data;
      setPosts((prev) => [mapPost(raw), ...prev]);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message ?? 'No se pudo crear el anuncio';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const editPost = useCallback(async (id, formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updatePost(id, formData);
      const raw = response.data.post ?? response.data.data ?? response.data;
      setPosts((prev) => prev.map((p) => (p.id === id ? mapPost(raw) : p)));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message ?? 'No se pudo actualizar el anuncio';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const removePost = useCallback(async (id) => {
    const snapshot = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePost(id);
      return { success: true };
    } catch (err) {
      setPosts(snapshot);
      setError(err.response?.data?.message ?? 'No se pudo eliminar el anuncio');
      return { success: false };
    }
  }, [posts]);

  const restorePost = useCallback(async (id) => {
    try {
      const response = await reactivatePost(id);
      const raw = response.data.post ?? response.data.data ?? response.data;
      setPosts((prev) => prev.map((p) => (p.id === id ? mapPost(raw) : p)));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message ?? 'No se pudo restaurar el anuncio' };
    }
  }, []);

  return { posts, loading, error, fetchPosts, addPost, editPost, removePost, restorePost };
}

export function usePostDetail(id) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getPostById(id);
      const data = response.data.data ?? response.data;
      setPost(mapPost(data));
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo cargar el anuncio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { post, loading, error, fetchPost };
}