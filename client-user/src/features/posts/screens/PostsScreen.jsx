// src/features/posts/screens/PostsScreen.jsx
// Pantalla "Anuncios del Bus" — replica el mockup: tarjetas con icono cuadrado,
// título en negrita y "Hace X min". Para DRIVER_ROLE/ADMIN_ROLE agrega un botón
// flotante para publicar y acciones de editar/eliminar (funciones portadas de
// client-admin, features/post/pages/PostListPage.jsx). Los urgentes se destacan en rojo y
// el ADMIN puede ver los eliminados y restaurarlos. post-service solo devuelve los avisos
// generales y los del grupo (o grupos) del usuario (al admin, todos).
import React, { useEffect, useCallback, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, View, Text, Image, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePosts } from '../hooks/usePosts';
import useUrgentPostsStore from '../store/urgentPostsStore';
import { getGroups } from '../../../shared/api/groupApi';
import PostFormModal from '../components/PostFormModal';
import ConfirmModal from '../../../shared/components/common/ConfirmModal';
import { EmptyState, LoadingSpinner } from '../../../shared/components/common/Common';
import useAuthStore from '../../../shared/store/authStore';
import { COLORS, SPACING, FONT_SIZE, RADIUS, SHADOWS, MANAGER_ROLES } from '../../../shared/constants/theme';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

export default function PostsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const canManage = MANAGER_ROLES.includes(user?.role);
  const isAdmin = user?.role === 'ADMIN_ROLE';

  const { posts, loading, error, fetchPosts, addPost, editPost, removePost, restorePost } = usePosts();
  const setUrgentPosts = useUrgentPostsStore((state) => state.setPosts);
  const markUrgentSeen = useUrgentPostsStore((state) => state.markSeen);
  const [showDeleted, setShowDeleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formModal, setFormModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => { fetchPosts(false); }, [fetchPosts]);

  // Abrir "Anuncios" cuenta como revisar los urgentes (quita el punto rojo de la pestaña)
  useFocusEffect(useCallback(() => { markUrgentSeen(); }, [markUrgentSeen]));
  useEffect(() => {
    setUrgentPosts(posts);
    if (navigation.isFocused()) markUrgentSeen();
  }, [posts, setUrgentPosts, markUrgentSeen, navigation]);

  // Grupos a los que el conductor (o admin) puede dirigir un aviso
  useEffect(() => {
    if (!canManage) return;
    getGroups()
      .then(({ data }) => setGroups((data.data ?? []).filter((g) => g.isActive)))
      .catch(() => setGroups([]));
  }, [canManage]);

  const audienceLabel = (post) => {
    if (!post.groupId) return 'General';
    if (!canManage) return 'Tu grupo';
    return groups.find((g) => g._id === post.groupId)?.name ?? 'Grupo';
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(false);
    setRefreshing(false);
  }, [fetchPosts]);

  const handleFormSubmit = async (formData) => {
    const result = formModal === 'create' ? await addPost(formData) : await editPost(formModal.post.id, formData);
    if (result.success) setFormModal(null);
  };

  const handleDeleteConfirm = async () => {
    await removePost(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleRestore = async (post) => {
    const result = await restorePost(post.id);
    if (!result.success) Alert.alert('No se pudo restaurar', result.message);
  };

  const visiblePosts = isAdmin && showDeleted ? posts : posts.filter((p) => !p.isDeleted);
  const deletedCount = posts.filter((p) => p.isDeleted).length;

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <EmptyState message={error ?? 'No hay anuncios por el momento'} icon="campaign" /> : null}
        ListHeaderComponent={
          <>
            {isAdmin && (deletedCount > 0 || showDeleted) ? (
              <TouchableOpacity
                style={[styles.deletedToggle, showDeleted && styles.deletedToggleOn]}
                onPress={() => setShowDeleted((v) => !v)}
              >
                <MaterialIcons name={showDeleted ? 'visibility-off' : 'restore-from-trash'} size={16} color={COLORS.primary} />
                <Text style={styles.deletedToggleText}>
                  {showDeleted ? 'Ocultar eliminados' : `Ver eliminados (${deletedCount})`}
                </Text>
              </TouchableOpacity>
            ) : null}
            {loading && visiblePosts.length === 0 ? <LoadingSpinner /> : null}
          </>
        }
        renderItem={({ item }) => {
          const isOwner = user?.id === item.createdBy || user?.uid === item.createdBy;
          const canEdit = canManage && !item.isDeleted && (isAdmin || isOwner);
          const urgent = item.isUrgent && !item.isDeleted;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              // Un eliminado solo lo puede abrir el admin para restaurarlo desde la lista
              onPress={() => (item.isDeleted ? null : navigation.navigate('PostDetail', { id: item.id }))}
              style={[styles.card, urgent && styles.cardUrgent, item.isDeleted && styles.cardDeleted]}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.icon} />
              ) : (
                <View style={styles.iconPlaceholder}>
                  <MaterialIcons name="directions-bus" size={26} color={COLORS.accentDark} />
                </View>
              )}
              <View style={styles.cardBody}>
                {urgent ? <Text style={styles.urgentLabel}>URGENTE</Text> : null}
                {item.isDeleted ? <Text style={styles.deletedLabel}>ELIMINADO</Text> : null}
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardTime}>
                  {timeAgo(item.createdAt)} · {audienceLabel(item)}
                </Text>
              </View>
              {isAdmin && item.isDeleted ? (
                <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(item)}>
                  <MaterialIcons name="restore" size={15} color={COLORS.success} />
                  <Text style={styles.restoreText}>Restaurar</Text>
                </TouchableOpacity>
              ) : null}
              {canEdit ? (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setFormModal({ post: item })}>
                    <MaterialIcons name="edit" size={15} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={() => setDeleteTarget(item)}>
                    <MaterialIcons name="delete-outline" size={15} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      {canManage ? (
        <TouchableOpacity style={styles.fab} onPress={() => setFormModal('create')} activeOpacity={0.85}>
          <MaterialIcons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <PostFormModal
        visible={Boolean(formModal)}
        post={formModal?.post}
        groups={groups}
        loading={loading}
        onClose={() => setFormModal(null)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="Eliminar anuncio"
        message={deleteTarget ? `¿Seguro que quieres eliminar "${deleteTarget.title}"?` : ''}
        loading={loading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { flex: 1 },
  listContent: { padding: SPACING.md },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.soft },
  icon: { width: 52, height: 52, borderRadius: RADIUS.md, marginRight: SPACING.md },
  iconPlaceholder: { width: 52, height: 52, borderRadius: RADIUS.md, marginRight: SPACING.md, backgroundColor: '#FFF6DA', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, lineHeight: 21 },
  cardTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: SPACING.sm },
  iconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f0fe' },
  iconBtnDanger: { backgroundColor: '#fee2e2' },
  cardUrgent: { backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: COLORS.error },
  cardDeleted: { opacity: 0.6 },
  urgentLabel: { fontSize: 10.5, fontWeight: '800', color: COLORS.error, letterSpacing: 0.5, marginBottom: 2 },
  deletedLabel: { fontSize: 10.5, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 2 },
  restoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: SPACING.sm,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#dcfce7',
  },
  restoreText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.success },
  deletedToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: SPACING.md,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  deletedToggleOn: { borderColor: COLORS.primary, backgroundColor: '#e8f1f9' },
  deletedToggleText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary },
  fab: { position: 'absolute', right: SPACING.lg, bottom: SPACING.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
});