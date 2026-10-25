import { useEffect } from 'react';
import { useGroupStore } from '../store/groupStore.js';

export const DeleteGroupModal = ({ group, onClose }) => {
    const removeGroup = useGroupStore((s) => s.removeGroup);
    const loading      = useGroupStore((s) => s.loading);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleConfirm = async () => {
        await removeGroup(group._id);
        onClose();
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
                background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '28px 24px 24px',
                textAlign: 'center',
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                    <svg width="26" height="26" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                </div>

                <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#111827' }}>
                    ¿Eliminar grupo?
                </p>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                    Se eliminará <strong style={{ color: '#111827' }}>{group.name}</strong> y los pasajeros vinculados quedarán sin grupo. Esta acción no se puede deshacer.
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                            background: loading ? '#fca5a5' : '#ef4444',
                            color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                        }}
                    >
                        {loading ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
