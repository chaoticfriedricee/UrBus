import { useState } from 'react';
import { useAuthStore }     from '../../auth/store/authStore.js';
import { usePassengerStore } from '../store/passengerStore.js';
import { AccountInfoModal } from '../../../shared/components/AccountInfoModal.jsx';
import { AbsenceReasonModal } from './AbsenceReasonModal.jsx';
import { getUserById } from '../../../shared/api/users.js';
import { showError } from '../../../shared/utils/toast.js';
import { isTodayGT } from '../../../shared/utils/date.js';

const ABSENCE_REASON_LABELS = {
    SALUD: 'Motivos de Salud',
    EMERGENCIA: 'Emergencia',
    EXTRACURRICULAR: 'Actividad Extracurricular',
    OTRO: 'Otro Motivo',
};

const AVATAR_PALETTE = [
    { bg: '#f9d4c8', color: '#b85c3a' },
    { bg: '#d4e8f9', color: '#2e6fa3' },
    { bg: '#d4f0e0', color: '#2e7d52' },
    { bg: '#f9e8d4', color: '#a06030' },
    { bg: '#e8d4f9', color: '#6030a0' },
    { bg: '#f9f0d4', color: '#8a7020' },
];

function PassengerAvatar({ name }) {
    const initials = name
        ? name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
        : '?';
    const palette = AVATAR_PALETTE[name ? name.charCodeAt(0) % AVATAR_PALETTE.length : 0];
    return (
        <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: palette.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800, color: palette.color,
            flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            letterSpacing: '-0.5px',
        }}>
            {initials}
        </div>
    );
}

function Checkbox({ checked, onChange, title, disabled }) {
    return (
        <div
            onClick={disabled ? undefined : onChange}
            title={title}
            style={{
                width: 26, height: 26, borderRadius: 6,
                border: checked ? 'none' : '2px solid #d1d5db',
                background: checked ? '#4ade80' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.65 : 1,
                flexShrink: 0,
                transition: 'all 0.15s',
                boxShadow: checked ? '0 2px 6px rgba(74,222,128,0.35)' : 'none',
            }}
        >
            {checked && (
                <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.8" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </div>
    );
}

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

export const PassengerCard = ({ passenger, onEdit, onDelete }) => {
    const user    = useAuthStore((s) => s.user);
    const isAdmin = user?.role === 'ADMIN_ROLE';
    const isDriver = user?.role === 'DRIVER_ROLE';
    const canToggleStatus = isAdmin || isDriver;
    const canViewInfo = isAdmin || isDriver;

    const toggleStatus = usePassengerStore((s) => s.toggleStatus);
    const clearPassengerAbsenceReason = usePassengerStore((s) => s.clearPassengerAbsenceReason);
    const { _id, name, status, address, absenceReason, absenceReasonNote, absenceReasonAt } = passenger;
    const isPresent = status === 'PRESENT';

    // El motivo de ausencia solo se muestra si fue registrado hoy (horario de Guatemala);
    // a partir de las 0:00 GT deja de mostrarse automáticamente.
    const showAbsenceReason = !isPresent && absenceReason && isTodayGT(absenceReasonAt);
    const absenceReasonLabel = ABSENCE_REASON_LABELS[absenceReason] ?? absenceReason;

    const [infoAccount, setInfoAccount] = useState(null);
    const [infoLoading, setInfoLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showAbsenceModal, setShowAbsenceModal] = useState(false);

    const handleViewInfo = async () => {
        setShowInfo(true);
        setInfoLoading(true);
        try {
            const { data } = await getUserById(passenger.userId);
            setInfoAccount(data);
        } catch (err) {
            setInfoAccount(null);
            showError(err.response?.data?.message || 'No se pudo cargar la información de la cuenta');
        } finally {
            setInfoLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px',
            padding: '14px 18px',
            background: '#fff',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                flex: '1 1 200px', minWidth: 0,
            }}>
                <PassengerAvatar name={name} />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        margin: 0, fontWeight: 700, fontSize: 15.5,
                        color: '#1a1a2e', lineHeight: 1.25,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {name}
                    </p>
                    <p style={{
                        margin: '3px 0 0', fontSize: 12.5, color: '#9ca3af',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {address ?? `ID: ${_id?.slice(-6)}`}
                    </p>
                    {showAbsenceReason && (
                        <p style={{
                            margin: '4px 0 0', fontSize: 11.5, fontWeight: 700, color: '#b45309',
                            display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
                        }}>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
                            </svg>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {absenceReasonLabel}
                                {absenceReasonNote ? `: ${absenceReasonNote}` : ''}
                            </span>
                            {canToggleStatus && (
                                <button
                                    onClick={() => clearPassengerAbsenceReason(_id)}
                                    title="Quitar motivo de ausencia"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 15, height: 15, borderRadius: '50%', border: 'none',
                                        background: 'rgba(180,83,9,0.12)', color: '#b45309',
                                        cursor: 'pointer', flexShrink: 0, padding: 0,
                                    }}
                                >
                                    <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                                        <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                                    </svg>
                                </button>
                            )}
                        </p>
                    )}
                </div>
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                gap: 8, marginLeft: 'auto', justifyContent: 'flex-end',
            }}>
                {canToggleStatus && (
                    <button
                        onClick={() => setShowAbsenceModal(true)}
                        title="Registrar motivo de ausencia"
                        style={{
                            padding: '7px 12px', borderRadius: 9,
                            border: '1.5px solid #e5e7eb', background: '#fff',
                            color: '#374151', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                        }}
                    >
                        ¿Motivo de ausencia?
                    </button>
                )}

                {/* Un pasajero solo recibe el nombre de sus compañeros de grupo, no su asistencia */}
                {canToggleStatus && (
                    <Checkbox
                        checked={isPresent}
                        onChange={() => toggleStatus(_id)}
                        title={isPresent ? 'Marcar como ausente' : 'Marcar como presente'}
                    />
                )}

                {canViewInfo && (
                    <IconBtn onClick={handleViewInfo} title="Ver información de contacto" color="#005691">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
                            <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" />
                        </svg>
                    </IconBtn>
                )}

                {isAdmin && (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <IconBtn onClick={() => onEdit(passenger)} title="Editar" color="#005691">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </IconBtn>
                        <IconBtn onClick={() => onDelete(passenger)} title="Eliminar" color="#ef4444">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6" strokeLinecap="round"/>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                        </IconBtn>
                    </div>
                )}
            </div>

            {showInfo && (
                <AccountInfoModal
                    account={infoAccount}
                    loading={infoLoading}
                    onClose={() => setShowInfo(false)}
                />
            )}

            {showAbsenceModal && (
                <AbsenceReasonModal
                    passenger={passenger}
                    onClose={() => setShowAbsenceModal(false)}
                />
            )}
        </div>
    );
};