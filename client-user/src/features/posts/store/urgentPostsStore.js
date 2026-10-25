// src/features/posts/store/urgentPostsStore.js
// Indicador de anuncios urgentes sin revisar (el punto rojo en la pestaña "Anuncios"),
// como el de la barra lateral de client-admin. lastSeenAt se guarda en el teléfono.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { latestUrgentAt, hasUnreadUrgent } from '../utils/urgent';

const useUrgentPostsStore = create(
  persist(
    (set, get) => ({
      latestAt: null,
      lastSeenAt: null,
      setPosts: (posts) => set({ latestAt: latestUrgentAt(posts) }),
      markSeen: () => set({ lastSeenAt: new Date().toISOString() }),
      hasUnread: () => hasUnreadUrgent(get().latestAt, get().lastSeenAt),
    }),
    {
      name: 'client-user-urgent-posts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lastSeenAt: state.lastSeenAt }),
    }
  )
);

export default useUrgentPostsStore;
