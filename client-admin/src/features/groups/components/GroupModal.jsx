import { useEffect, useRef, useState } from 'react';
import { useGroupStore } from '../store/groupStore.js';

const INPUT_STYLE = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid #e5e7eb', fontSize: 14, color: '#111827',
    outline: 'none', boxSizing: 'border-box', background: '#fff',
    transition: 'border-color 0.15s',
};

export const GroupModal = ({ group = null, onClose }) => {
    const isEdit = Boolean(group);

    const addGroup  = useGroupStore((s) => s.addGroup);
    const editGroup = useGroupStore((s) => s.editGroup);
    const loading   = useGroupStore((s) => s.loading);

    const [name, setName] = useState(group?.name ?? '');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = async () => {
        if (!name.trim() || name.trim().length < 3) {
            setError('Mínimo 3 caracteres');
            return;
        }

        const result = isEdit
            ? await editGroup(group._id, { name: name.trim() })
            : await addGroup({ name: name.trim() });

        if (result?.success !== false) onClose();
    };

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 100, padding: 16,
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 9, background: '#e8f0fe',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="18" height="18" fill="none" stroke="#005691" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                                <circle cx="9" cy="7" r="4" />
                            </svg>
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827' }}>
                            {isEdit ? 'Editar grupo' : 'Nuevo grupo'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, display: 'flex' }}
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            Nombre del grupo
                        </label>
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                            placeholder="Ej. Ruta Zona 10 - Mañana"
                            style={{ ...INPUT_STYLE, borderColor: error ? '#ef4444' : '#e5e7eb' }}
                        />
                        {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
                        {!isEdit && (
                            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9ca3af' }}>
                                Al crear el grupo se generará un código único para que los pasajeros se unan.
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            padding: '9px 22px', borderRadius: 10, border: 'none',
                            background: loading ? '#93c5fd' : '#005691',
                            color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                        }}
                    >
                        {isEdit ? 'Guardar cambios' : 'Crear grupo'}
                    </button>
                </div>
            </div>
        </div>
    );
};
