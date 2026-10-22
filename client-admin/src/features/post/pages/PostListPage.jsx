import { useState, useEffect } from 'react';
import { usePosts } from '../hooks/usePosts.js';
import { usePostStore } from '../store/postStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { PostCard } from '../components/PostCard.jsx';
import { PostModal } from '../components/PostModal.jsx';
import { DeletePostModal } from '../components/DeletePostModal.jsx';

function SkeletonCard() {
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '16px 18px', background: '#fff',
        }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: '#f0f0f0', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, width: '55%', background: '#f0f0f0', borderRadius: 6 }} />
                <div style={{ height: 12, width: '80%', background: '#f0f0f0', borderRadius: 6 }} />
                <div style={{ height: 12, width: '40%', background: '#f0f0f0', borderRadius: 6 }} />
            </div>
        </div>
    );
}

function EmptyState({ onRefetch }) {
    return (
        <div style={{ textAlign: 'center', padding: '52px 20px' }}>
            <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
                <svg width="30" height="30" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l6 6v10a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                </svg>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
                Sin anuncios publicados
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9ca3af' }}>
                Crea el primero usando el botón de arriba
            </p>
            <button
                onClick={onRefetch}
                style={{
                    padding: '9px 22px', borderRadius: 10, border: 'none',
                    background: '#005691', color: '#fff', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer',
                }}
            >
                Reintentar
            </button>
        </div>
    );
}

export const PostListPage = () => {
    const {
        posts,
        allPosts,
        loading,
        error,
        isAdmin,
        isDriver,
        refetch,
        restorePost,
    } = usePosts();

    const [modal, setModal] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const markPostsSeen = usePostStore((s) => s.markPostsSeen);

    useEffect(() => { markPostsSeen(); }, [markPostsSeen]);

    // Nombres de grupo para las etiquetas "Grupo: ..." (solo conductor y admin pueden listar grupos)
    const fetchGroups = useGroupStore((s) => s.fetchGroups);
    useEffect(() => {
        if (isAdmin || isDriver) fetchGroups();
    }, [isAdmin, isDriver, fetchGroups]);

    const visiblePosts = isAdmin && showDeleted
        ? allPosts
        : posts.filter((p) => !p.isDeleted);

    const activeCount = posts.filter((p) => !p.isDeleted).length;

    const canCreate = isAdmin || isDriver;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            minHeight: '100%', background: '#f4f6fb',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 0 20px 0',
                flexWrap: 'wrap', gap: 12,
            }}>
                <div>
                    <h1 style={{
                        margin: 0, fontSize: 22, fontWeight: 800,
                        color: '#111827', letterSpacing: '-0.3px',
                    }}>
                        Anuncios del Bus
                    </h1>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>
                        {loading
                            ? 'Cargando...'
                            : error
                                ? 'Error al cargar datos'
                                : `${activeCount} anuncio${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''}`}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isAdmin && (
                        <button
                            onClick={() => setShowDeleted((v) => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 10,
                                border: `1.5px solid ${showDeleted ? '#005691' : '#e5e7eb'}`,
                                background: showDeleted ? '#e8f1f9' : '#fff',
                                color: showDeleted ? '#005691' : '#374151',
                                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {showDeleted ? 'Ocultar eliminados' : 'Ver eliminados'}
                        </button>
                    )}
                    <button
                        onClick={refetch}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 10,
                            border: '1.5px solid #e5e7eb',
                            background: '#fff', color: '#374151',
                            fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        }}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3.51 15a9 9 0 1 0 .49-4.95" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Actualizar
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setModal('create')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 10, border: 'none',
                                background: '#005691', color: '#fff',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nuevo anuncio
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div style={{
                background: '#fff', borderRadius: 20,
                boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                overflow: 'hidden', border: '1px solid #f0f0f0',
            }}>
                {loading ? (
                    <>
                        {[1, 2, 3, 4].map((k, i) => (
                            <div key={k}>
                                {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />}
                                <SkeletonCard />
                            </div>
                        ))}
                    </>
                ) : error || visiblePosts.length === 0 ? (
                    <EmptyState onRefetch={refetch} />
                ) : (
                    visiblePosts.map((post, i) => (
                        <div key={post._id}>
                            {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />}
                            <PostCard
                                post={post}
                                onEdit={(p) => setModal({ mode: 'edit', post: p })}
                                onDelete={(p) => setModal({ mode: 'delete', post: p })}
                                onRestore={(p) => restorePost(p._id)}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {modal === 'create' && (
                <PostModal onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'edit' && (
                <PostModal post={modal.post} onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'delete' && (
                <DeletePostModal post={modal.post} onClose={() => setModal(null)} />
            )}
        </div>
    );
};