import { useEffect } from 'react';
import { useGroupStore } from '../store/groupStore.js';
import { copyToClipboard } from '../../../shared/utils/clipboard.js';
import { showSuccess, showError } from '../../../shared/utils/toast.js';

export const GroupDetailModal = ({ groupId, onClose }) => {
    const activeGroup    = useGroupStore((s) => s.activeGroup);
    const activeLoading   = useGroupStore((s) => s.activeLoading);
    const fetchGroupDetail = useGroupStore((s) => s.fetchGroupDetail);
    const clearActiveGroup = useGroupStore((s) => s.clearActiveGroup);

    useEffect(() => {
        fetchGroupDetail(groupId);
        return () => clearActiveGroup();
    }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const passengers = activeGroup?.passengers ?? [];

    const handleCopy = async () => {
        if (await copyToClipboard(activeGroup.code)) showSuccess('Código copiado');
        else showError(`No se pudo copiar. El código es ${activeGroup.code}`);
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
                background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', flexShrink: 0,
                }}>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827', overflowWrap: 'anywhere' }}>
                            {activeGroup?.name ?? 'Grupo'}
                        </p>
                        {activeGroup && (
                            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#9ca3af' }}>
                                {passengers.length} pasajero{passengers.length === 1 ? '' : 's'} en este grupo
                            </p>
                        )}
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

                {activeGroup?.code && (
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px',
                        padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #f3f4f6', flexShrink: 0,
                    }}>
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Código de unión
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                                Los pasajeros lo ingresan en «Unirme a un grupo» para quedar en este grupo.
                            </p>
                        </div>
                        <button
                            onClick={handleCopy}
                            title="Copiar código de unión"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 14px', borderRadius: 10,
                                border: '1.5px dashed #005691', background: '#f0f7ff',
                                color: '#005691', fontSize: 16, fontWeight: 800,
                                letterSpacing: '2px', cursor: 'pointer', fontFamily: 'monospace',
                            }}
                        >
                            {activeGroup.code}
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </button>
                    </div>
                )}

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {activeLoading ? (
                        <p style={{ textAlign: 'center', padding: '32px 20px', fontSize: 13, color: '#9ca3af' }}>
                            Cargando pasajeros...
                        </p>
                    ) : passengers.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '32px 20px', fontSize: 13, color: '#9ca3af' }}>
                            Todavía no hay pasajeros en este grupo. Comparte el código para que se unan.
                        </p>
                    ) : (
                        passengers.map((p, i) => (
                            <div key={p._id}>
                                {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 20px' }} />}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: p.status === 'PRESENT' ? '#4ade80' : '#d1d5db', flexShrink: 0,
                                    }} />
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                                        {p.name}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
