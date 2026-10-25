import { useAuthStore } from '../../auth/store/authStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';

function IconBtn({ onClick, title, color, children }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1.5px solid ${color}30`,
                background: `${color}12`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${color}25`}
            onMouseLeave={(e) => e.currentTarget.style.background = `${color}12`}
        >
            {children}
        </button>
    );
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
}

export const PostCard = ({ post, onEdit, onDelete, onRestore }) => {
    const user = useAuthStore((s) => s.user);
    const isAdmin  = user?.role === 'ADMIN_ROLE';
    const isDriver = user?.role === 'DRIVER_ROLE';
    const isOwner  = user?.id === post.createdBy || user?.uid === post.createdBy;

    const canEdit    = isAdmin || (isDriver && isOwner);
    const canRestore = isAdmin;

    const { title, content, imageUrl, isDeleted, isUrgent, createdAt, groupId } = post;

    // post-service solo entrega avisos generales y los de los grupos del usuario
    const groups = useGroupStore((s) => s.groups);
    const audience = !groupId
        ? 'General'
        : (isAdmin || isDriver)
            ? `Grupo: ${groups.find((g) => g._id === groupId)?.name ?? '—'}`
            : 'Tu grupo';

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '16px 18px',
            background: isUrgent && !isDeleted ? '#fef2f2' : '#fff',
            borderLeft: isUrgent && !isDeleted ? '4px solid #ef4444' : '4px solid transparent',
            opacity: isDeleted ? 0.55 : 1,
            transition: 'opacity 0.2s',
        }}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={title}
                    style={{
                        width: 52, height: 52, borderRadius: 12,
                        objectFit: 'cover', flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    }}
                />
            ) : (
                <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="22" height="22" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{
                        margin: 0, fontWeight: 700, fontSize: 15,
                        color: '#1a1a2e', lineHeight: 1.3,
                    }}>
                        {title}
                    </p>
                    {isUrgent && !isDeleted && (
                        <span style={{
                            fontSize: 10, fontWeight: 800, color: '#fff',
                            background: '#ef4444', borderRadius: 4, padding: '1px 7px',
                            letterSpacing: '0.3px',
                        }}>
                            URGENTE
                        </span>
                    )}
                    {isDeleted && (
                        <span style={{
                            fontSize: 10, fontWeight: 700, color: '#ef4444',
                            background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: 4, padding: '1px 6px',
                        }}>
                            ELIMINADO
                        </span>
                    )}
                </div>
                <p style={{
                    margin: '4px 0 0', fontSize: 13, color: '#6b7280',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                }}>
                    {content}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9ca3af' }}>
                    {timeAgo(createdAt)} · {audience}
                </p>
            </div>

            {(canEdit || canRestore) && (
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, paddingTop: 2 }}>
                    {isDeleted ? (
                        canRestore && (
                            <IconBtn onClick={() => onRestore(post)} title="Reactivar" color="#22c55e">
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3.51 15a9 9 0 1 0 .49-4.95" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </IconBtn>
                        )
                    ) : (
                        <>
                            {canEdit && (
                                <IconBtn onClick={() => onEdit(post)} title="Editar" color="#005691">
                                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </IconBtn>
                            )}
                            {canEdit && (
                                <IconBtn onClick={() => onDelete(post)} title="Eliminar" color="#ef4444">
                                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                </IconBtn>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};