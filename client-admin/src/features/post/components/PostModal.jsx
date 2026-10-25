import { useState, useEffect, useRef } from 'react';
import { usePostStore } from '../store/postStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';

export const PostModal = ({ post, onClose }) => {
    const isEdit = Boolean(post);
    const addPost = usePostStore((s) => s.addPost);
    const editPost = usePostStore((s) => s.editPost);
    const loading = usePostStore((s) => s.loading);

    const [title, setTitle] = useState(post?.title ?? '');
    const [content, setContent] = useState(post?.content ?? '');
    const [isUrgent, setIsUrgent] = useState(post?.isUrgent ?? false);
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(post?.imageUrl ?? null);
    // '' = aviso general; si no, id del grupo destinatario (post-service valida que sea tuyo)
    const [groupId, setGroupId] = useState(post?.groupId ?? '');
    const fileRef = useRef(null);

    // El conductor ve sus grupos; el admin, todos
    const groups = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetchGroups);
    const activeGroups = groups.filter((g) => g.isActive || g._id === groupId);

    useEffect(() => {
        if (groups.length === 0) fetchGroups();
    }, [groups.length, fetchGroups]);

    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [imageFile]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return;
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('content', content.trim());
        fd.append('isUrgent', String(isUrgent));
        if (groupId !== (post?.groupId ?? '')) fd.append('groupId', groupId);
        if (imageFile) fd.append('image', imageFile);

        const result = isEdit
            ? await editPost(post._id, fd)
            : await addPost(fd);

        if (result.success) onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
        }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: '#fff', borderRadius: 20,
                width: '100%', maxWidth: 480,
                boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 22px 16px',
                    borderBottom: '1px solid #f3f4f6',
                }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
                        {isEdit ? 'Editar anuncio' : 'Nuevo anuncio'}
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9ca3af', display: 'flex', padding: 4,
                    }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Título <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: El bus está a punto de llegar"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '10px 14px', borderRadius: 10,
                                border: '1.5px solid #e5e7eb',
                                fontSize: 14, color: '#111827',
                                outline: 'none', fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Contenido <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Escribe el mensaje del anuncio..."
                            rows={3}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '10px 14px', borderRadius: 10,
                                border: '1.5px solid #e5e7eb',
                                fontSize: 14, color: '#111827',
                                outline: 'none', resize: 'vertical',
                                fontFamily: 'inherit', lineHeight: 1.5,
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Dirigido a
                        </label>
                        <select
                            value={groupId}
                            onChange={(e) => setGroupId(e.target.value)}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '10px 14px', borderRadius: 10,
                                border: '1.5px solid #e5e7eb', background: '#fff',
                                fontSize: 14, color: '#111827', fontFamily: 'inherit',
                            }}
                        >
                            <option value="">Todos (aviso general)</option>
                            {activeGroups.map((g) => (
                                <option key={g._id} value={g._id}>Grupo: {g.name}</option>
                            ))}
                        </select>
                        <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9ca3af' }}>
                            Un aviso de grupo solo lo ven los pasajeros de ese grupo.
                        </p>
                    </div>

                    <div>
                        <label
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                border: `1.5px solid ${isUrgent ? '#ef4444' : '#e5e7eb'}`,
                                background: isUrgent ? '#fef2f2' : '#fff',
                                transition: 'all 0.15s',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                style={{ width: 17, height: 17, accentColor: '#ef4444', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: isUrgent ? '#b91c1c' : '#374151' }}>
                                Marcar como "Urgente"
                            </span>
                        </label>
                        <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9ca3af' }}>
                            Aparecerá destacado y activará un aviso en el menú lateral hasta que se revise.
                        </p>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Imagen (opcional)
                        </label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => setImageFile(e.target.files[0] || null)}
                        />
                        {preview ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                    src={preview}
                                    alt="preview"
                                    style={{ height: 90, borderRadius: 10, objectFit: 'cover', display: 'block' }}
                                />
                                <button
                                    onClick={() => { setImageFile(null); setPreview(null); }}
                                    style={{
                                        position: 'absolute', top: -8, right: -8,
                                        width: 22, height: 22, borderRadius: '50%',
                                        background: '#ef4444', border: 'none', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: 14, lineHeight: 1,
                                    }}
                                >×</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 16px', borderRadius: 10,
                                    border: '1.5px dashed #d1d5db',
                                    background: '#f9fafb', color: '#6b7280',
                                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="3" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                Subir imagen
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: 10,
                    padding: '14px 22px 20px',
                    borderTop: '1px solid #f3f4f6',
                }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '9px 18px', borderRadius: 10,
                            border: '1.5px solid #e5e7eb',
                            background: '#fff', color: '#374151',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim() || !content.trim()}
                        style={{
                            padding: '9px 20px', borderRadius: 10, border: 'none',
                            background: (!title.trim() || !content.trim()) ? '#93c5fd' : '#005691',
                            color: '#fff', fontSize: 13, fontWeight: 600,
                            cursor: (!title.trim() || !content.trim()) ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s',
                        }}
                    >
                        {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
