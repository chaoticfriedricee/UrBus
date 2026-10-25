import { useState } from 'react';
import { useUserStore } from '../store/userStore.js';
import { AccountInfoModal } from '../../../shared/components/AccountInfoModal.jsx';

const AVATAR_PALETTE = [
    { bg: '#f9d4c8', color: '#b85c3a' },
    { bg: '#d4e8f9', color: '#2e6fa3' },
    { bg: '#d4f0e0', color: '#2e7d52' },
    { bg: '#f9e8d4', color: '#a06030' },
    { bg: '#e8d4f9', color: '#6030a0' },
    { bg: '#f9f0d4', color: '#8a7020' },
];

const ROLE_LABELS = {
    ADMIN_ROLE:     'Administrador',
    PASSENGER_ROLE: 'Pasajero',
    DRIVER_ROLE:    'Conductor',
    USER_ROLE:      'Usuario',
};

const ROLE_COLORS = {
    ADMIN_ROLE:     { bg: '#fee2e2', color: '#b91c1c' },
    PASSENGER_ROLE: { bg: '#dbeafe', color: '#1d4ed8' },
    DRIVER_ROLE:    { bg: '#dcfce7', color: '#15803d' },
    USER_ROLE:      { bg: '#f3f4f6', color: '#4b5563' },
};

const ROLE_OPTIONS = ['ADMIN_ROLE', 'PASSENGER_ROLE', 'DRIVER_ROLE', 'USER_ROLE'];

function UserAvatar({ name }) {
    const initials = name
        ? name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
        : '?';
    const palette = AVATAR_PALETTE[name ? name.charCodeAt(0) % AVATAR_PALETTE.length : 0];
    return (
        <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: palette.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: palette.color,
            flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            letterSpacing: '-0.5px',
        }}>
            {initials}
        </div>
    );
}

function RoleBadge({ role }) {
    const palette = ROLE_COLORS[role] ?? ROLE_COLORS.USER_ROLE;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 10px', borderRadius: 999,
            background: palette.bg, color: palette.color,
            fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
            {ROLE_LABELS[role] ?? role ?? 'Sin rol'}
        </span>
    );
}

export const UserCard = ({ user, currentUserId }) => {
    const changeUserRole = useUserStore((s) => s.changeUserRole);
    const verifyEmail = useUserStore((s) => s.verifyEmail);
    const [updating, setUpdating] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const { id, name, surname, email, role, status, isEmailVerified } = user;
    const isSelf = String(id) === String(currentUserId);

    const handleRoleChange = async (e) => {
        const newRole = e.target.value;
        if (newRole === role) return;

        if (isSelf && role === 'ADMIN_ROLE' && newRole !== 'ADMIN_ROLE') {
            const confirmed = window.confirm(
                'Estás a punto de quitarte el rol de Administrador a ti mismo. ¿Deseas continuar?'
            );
            if (!confirmed) return;
        }

        setUpdating(true);
        await changeUserRole(id, newRole);
        setUpdating(false);
    };

    const handleVerifyEmail = async () => {
        const confirmed = window.confirm(
            `¿Confirmas que quieres verificar manualmente el email de ${name ?? ''} ${surname ?? ''}`.trim() + '?'
        );
        if (!confirmed) return;

        setVerifying(true);
        await verifyEmail(id);
        setVerifying(false);
    };

    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px',
            padding: '14px 18px', background: '#fff',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                flex: '1 1 200px', minWidth: 0,
            }}>
                <UserAvatar name={`${name ?? ''} ${surname ?? ''}`.trim()} />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        margin: 0, fontWeight: 700, fontSize: 15,
                        color: '#1a1a2e', lineHeight: 1.25,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        {`${name ?? ''} ${surname ?? ''}`.trim() || 'Sin nombre'}
                        {isSelf && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af' }}>(Tú)</span>
                        )}
                    </p>
                    <p style={{
                        margin: '3px 0 0', fontSize: 12.5, color: '#9ca3af',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {email}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <p style={{
                            margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            ID: {id}
                        </p>
                        <button
                            onClick={() => { navigator.clipboard?.writeText(id); }}
                            title="Copiar ID de la cuenta"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 18, height: 18, borderRadius: 5, border: 'none',
                                background: 'transparent', color: '#9ca3af', cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                gap: 8, marginLeft: 'auto', justifyContent: 'flex-end',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <RoleBadge role={role} />
                    {!status && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#ef4444' }}>Inactivo</span>
                    )}
                    {!isEmailVerified && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#f59e0b' }}>Email sin verificar</span>
                    )}
                </div>

                <button
                    onClick={() => setShowInfo(true)}
                    title="Ver información de la cuenta"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 9,
                        border: '1.5px solid #e5e7eb', background: '#fff',
                        color: '#005691', cursor: 'pointer', flexShrink: 0,
                    }}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
                        <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" />
                    </svg>
                </button>

                {!isEmailVerified && (
                    <button
                        onClick={handleVerifyEmail}
                        disabled={verifying}
                        title="Verificar email manualmente"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 12px', borderRadius: 9,
                            border: '1.5px solid #f59e0b', background: verifying ? '#fef3c7' : '#fff',
                            color: '#b45309', fontSize: 12, fontWeight: 700,
                            cursor: verifying ? 'not-allowed' : 'pointer',
                            opacity: verifying ? 0.7 : 1, flexShrink: 0, whiteSpace: 'nowrap',
                        }}
                    >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {verifying ? 'Verificando...' : 'Verificar'}
                    </button>
                )}

                <select
                    value={role ?? ''}
                    onChange={handleRoleChange}
                    disabled={updating}
                    title="Cambiar rol"
                    style={{
                        padding: '7px 10px', borderRadius: 9,
                        border: '1.5px solid #e5e7eb', background: '#fff',
                        color: '#374151', fontSize: 12.5, fontWeight: 600,
                        cursor: updating ? 'not-allowed' : 'pointer',
                        opacity: updating ? 0.6 : 1, flexShrink: 0,
                    }}
                >
                    {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                </select>
            </div>

            {showInfo && (
                <AccountInfoModal account={user} onClose={() => setShowInfo(false)} />
            )}
        </div>
    );
};