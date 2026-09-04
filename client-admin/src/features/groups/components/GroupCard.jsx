import { useState } from 'react';
import { showSuccess } from '../../../shared/utils/toast.js';

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

export const GroupCard = ({ group, canManage, onView, onEdit, onDelete, onToggleActive }) => {
    const { name, code, isActive, passengerCount } = group;
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(code);
        setCopied(true);
        showSuccess('Código copiado');
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            onClick={() => onView(group)}
            style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px',
                padding: '14px 18px', background: '#fff', cursor: 'pointer',
                opacity: isActive ? 1 : 0.6,
            }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                flex: '1 1 200px', minWidth: 0,
            }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 14, background: '#e8f0fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <svg width="22" height="22" fill="none" stroke="#005691" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
                    </svg>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        margin: 0, fontWeight: 700, fontSize: 15.5, color: '#1a1a2e',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {name}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#9ca3af' }}>
                        {passengerCount ?? 0} pasajero{passengerCount === 1 ? '' : 's'} · {isActive ? 'Activo' : 'Inactivo'}
                    </p>
                </div>
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                gap: 8, marginLeft: 'auto', justifyContent: 'flex-end',
            }}>
                <button
                    onClick={handleCopy}
                    title="Copiar código"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 9,
                        border: '1.5px dashed #005691', background: '#f0f7ff',
                        color: '#005691', fontSize: 13, fontWeight: 700,
                        letterSpacing: '1px', cursor: 'pointer',
                    }}
                >
                    {code}
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {copied
                            ? <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                            : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>
                        }
                    </svg>
                </button>

                {canManage && (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <IconBtn
                            onClick={(e) => { e.stopPropagation(); onToggleActive(group); }}
                            title={isActive ? 'Desactivar grupo' : 'Activar grupo'}
                            color={isActive ? '#b45309' : '#15803d'}
                        >
                            {isActive
                                ? <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" /></svg>
                                : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            }
                        </IconBtn>
                        <IconBtn onClick={(e) => { e.stopPropagation(); onEdit(group); }} title="Editar" color="#005691">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </IconBtn>
                        <IconBtn onClick={(e) => { e.stopPropagation(); onDelete(group); }} title="Eliminar" color="#ef4444">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                        </IconBtn>
                    </div>
                )}
            </div>
        </div>
    );
};
