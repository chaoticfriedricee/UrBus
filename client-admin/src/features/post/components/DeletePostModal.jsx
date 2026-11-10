import { usePostStore } from '../store/postStore.js';
import { ConfirmModal } from '../../../shared/ui/index.js';

export const DeletePostModal = ({ post, onClose }) => {
  const removePost = usePostStore((s) => s.removePost);
  const loading = usePostStore((s) => s.loading);

  const handleConfirm = async () => {
    await removePost(post._id);
    onClose();
  };

  return (
    <ConfirmModal
      title="Eliminar anuncio"
      confirmLabel="Sí, eliminar"
      loadingLabel="Eliminando…"
      loading={loading}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      ¿Seguro que quieres eliminar <strong style={{ color: 'var(--ink)' }}>«{post.title}»</strong>? Quedará marcado como
      eliminado, pero podrás reactivarlo.
    </ConfirmModal>
  );
};
