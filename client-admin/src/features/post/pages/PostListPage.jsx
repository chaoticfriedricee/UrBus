import { useState, useEffect } from 'react';
import { usePosts } from '../hooks/usePosts.js';
import { usePostStore } from '../store/postStore.js';
import { useAuthStore } from '../../auth/store/authStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { PostCard } from '../components/PostCard.jsx';
import { PostModal } from '../components/PostModal.jsx';
import { DeletePostModal } from '../components/DeletePostModal.jsx';
import { EmptyState, Icon, PageHeader, RefreshButton, SkeletonRows } from '../../../shared/ui/index.js';
import { navLabel } from '../../../app/layouts/navConfig.js';

export const PostListPage = () => {
  const { posts, allPosts, loading, error, isAdmin, isDriver, refetch, restorePost } = usePosts();
  const role = useAuthStore((s) => s.user?.role);

  const [modal, setModal] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const markPostsSeen = usePostStore((s) => s.markPostsSeen);

  useEffect(() => {
    markPostsSeen();
  }, [markPostsSeen]);

  const fetchGroups = useGroupStore((s) => s.fetchGroups);
  useEffect(() => {
    if (isAdmin || isDriver) fetchGroups();
  }, [isAdmin, isDriver, fetchGroups]);

  const visiblePosts = isAdmin && showDeleted ? allPosts : posts.filter((p) => !p.isDeleted);
  const activeCount = posts.filter((p) => !p.isDeleted).length;
  const canCreate = isAdmin || isDriver;

  const subtitle = loading
    ? 'Cargando…'
    : error
      ? 'No se pudieron cargar los datos'
      : `${activeCount} anuncio${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''}`;

  return (
    <div className="page">
      <PageHeader role={role} title={navLabel(role, 'posts')} subtitle={subtitle}>
        {isAdmin && (
          <button type="button" className="btn btn-ghost" onClick={() => setShowDeleted((value) => !value)}>
            <Icon name="eye" size={16} />
            {showDeleted ? 'Ocultar eliminados' : 'Ver eliminados'}
          </button>
        )}
        <RefreshButton onClick={refetch} disabled={loading} />
        {canCreate && (
          <button type="button" className="btn btn-accent" onClick={() => setModal('create')}>
            <Icon name="plus" size={16} strokeWidth={2.4} />
            Nuevo anuncio
          </button>
        )}
      </PageHeader>

      <div className="card list">
        {loading ? (
          <SkeletonRows count={4} />
        ) : error || visiblePosts.length === 0 ? (
          <EmptyState
            icon="megaphone"
            title="Sin anuncios publicados"
            text={canCreate ? 'Publica el primero para avisar a tus pasajeros.' : 'Cuando tu conductor publique un aviso, lo verás aquí.'}
            actionLabel="Reintentar"
            onAction={refetch}
          />
        ) : (
          visiblePosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onEdit={(p) => setModal({ mode: 'edit', post: p })}
              onDelete={(p) => setModal({ mode: 'delete', post: p })}
              onRestore={(p) => restorePost(p._id)}
            />
          ))
        )}
      </div>

      {modal === 'create' && <PostModal onClose={() => setModal(null)} />}
      {modal?.mode === 'edit' && <PostModal post={modal.post} onClose={() => setModal(null)} />}
      {modal?.mode === 'delete' && <DeletePostModal post={modal.post} onClose={() => setModal(null)} />}
    </div>
  );
};
