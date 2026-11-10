import { useAuthStore } from '../../auth/store/authStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { Icon } from '../../../shared/ui/index.js';

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
};

export const PostCard = ({ post, onEdit, onDelete, onRestore }) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN_ROLE';
  const isDriver = user?.role === 'DRIVER_ROLE';
  const isOwner = user?.id === post.createdBy || user?.uid === post.createdBy;

  const canEdit = isAdmin || (isDriver && isOwner);
  const canRestore = isAdmin;

  const { title, content, imageUrl, isDeleted, isUrgent, createdAt, groupId } = post;

  const groups = useGroupStore((s) => s.groups);
  const audience = !groupId
    ? 'General'
    : isAdmin || isDriver
      ? `Grupo: ${groups.find((g) => g._id === groupId)?.name ?? '—'}`
      : 'Tu grupo';

  return (
    <article className={`row post-row ${isUrgent && !isDeleted ? 'is-urgent' : ''} ${isDeleted ? 'is-muted' : ''}`}>
      {imageUrl ? (
        <img className="post-thumb" src={imageUrl} alt={title} />
      ) : (
        <span className="tile" style={{ width: 64, height: 64 }}>
          <Icon name="megaphone" size={24} />
        </span>
      )}

      <div className="row-body" style={{ flex: '1 1 240px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <h2 className="row-title" style={{ whiteSpace: 'normal' }}>{title}</h2>
          {isUrgent && !isDeleted && <span className="badge badge-orange">Urgente</span>}
          {isDeleted && <span className="badge badge-red">Eliminado</span>}
        </div>
        <p className="post-text">{content}</p>
        <p className="post-foot">
          <span>{timeAgo(createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="badge">{audience}</span>
        </p>
      </div>

      {(canEdit || canRestore) && (
        <div className="row-actions" style={{ marginLeft: 0 }}>
          {isDeleted ? (
            canRestore && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onRestore(post)}
                title="Reactivar"
              >
                <Icon name="undo" size={15} />
                Reactivar
              </button>
            )
          ) : (
            canEdit && (
              <>
                <button
                  type="button"
                  className="icon-btn is-brand"
                  onClick={() => onEdit(post)}
                  title="Editar"
                  aria-label="Editar anuncio"
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn is-danger"
                  onClick={() => onDelete(post)}
                  title="Eliminar"
                  aria-label="Eliminar anuncio"
                >
                  <Icon name="trash" size={16} />
                </button>
              </>
            )
          )}
        </div>
      )}
    </article>
  );
};
