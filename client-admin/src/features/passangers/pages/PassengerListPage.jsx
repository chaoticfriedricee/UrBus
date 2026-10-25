import { useEffect, useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore.js';
import { usePassengerStore } from '../store/passengerStore.js';
import { PassengerCard } from '../components/PassengerCard.jsx';
import { PassengerModal } from '../components/PassengerModal.jsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.jsx';
import { GroupFilter } from '../components/GroupFilter.jsx';
import { useGroupStore } from '../../groups/store/groupStore.js';

function SkeletonCard() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', background: '#fff',
        }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0f0f0', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ height: 14, width: '48%', background: '#f0f0f0', borderRadius: 6 }} />
                <div style={{ height: 12, width: '32%', background: '#f0f0f0', borderRadius: 6 }} />
            </div>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: '#f0f0f0', flexShrink: 0 }} />
        </div>
    );
}

function EmptyState({ onRefetch, title = 'Sin pasajeros registrados', hint = 'Crea el primero usando el botón de arriba' }) {
    return (
        <div style={{ textAlign: 'center', padding: '52px 20px' }}>
            <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
                <svg width="30" height="30" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="9" cy="7" r="4" />
                    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeLinecap="round" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
                    <path d="M21 21v-2a4 4 0 0 0-3-3.85" strokeLinecap="round" />
                </svg>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
                {title}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9ca3af' }}>
                {hint}
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

export const PassengerListPage = () => {
    const user    = useAuthStore((s) => s.user);
    const isAdmin = user?.role === 'ADMIN_ROLE';
    // Conductor y admin eligen qué grupo de pasajeros ver; un pasajero solo ve el suyo
    const canFilter = isAdmin || user?.role === 'DRIVER_ROLE';

    const passengers      = usePassengerStore((s) => s.passengers);
    const loading         = usePassengerStore((s) => s.loading);
    const error           = usePassengerStore((s) => s.error);
    const fetchPassengers = usePassengerStore((s) => s.fetchPassengers);
    const getPresentCount = usePassengerStore((s) => s.getPresentCount);
    const selectedGroupId = usePassengerStore((s) => s.selectedGroupId);
    const selectGroup     = usePassengerStore((s) => s.selectGroup);

    const groups      = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetchGroups);

    const [modal, setModal] = useState(null);

    useEffect(() => {
        // Una elección recordada de otra cuenta con otro rol no aplica aquí
        if (!canFilter && selectedGroupId) selectGroup(null);
        else fetchPassengers();
        if (canFilter) fetchGroups();
    }, [fetchPassengers, fetchGroups, canFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedGroup = canFilter ? groups.find((g) => g._id === selectedGroupId) : null;
    const countLabel = canFilter
        ? `${getPresentCount()} de ${passengers.length} presentes`
        : `${passengers.length} pasajeros`;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            minHeight: '100%', background: '#f4f6fb',
        }}>

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
                        Lista de Pasajeros
                    </h1>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>
                        {loading
                            ? 'Cargando...'
                            : error
                                ? 'Error al cargar datos'
                                : selectedGroup
                                    ? `${selectedGroup.name} · ${countLabel}`
                                    : countLabel}
                    </p>
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={fetchPassengers}
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
                            Nuevo pasajero
                        </button>
                    </div>
                )}
            </div>

            {canFilter && groups.length > 0 && (
                <GroupFilter
                    groups={groups}
                    selectedGroupId={selectedGroup ? selectedGroupId : null}
                    onSelect={selectGroup}
                />
            )}

            <div style={{
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                overflow: 'hidden',
                border: '1px solid #f0f0f0',
            }}>
                {loading ? (
                    <>
                        {[1, 2, 3, 4, 5].map((k, i) => (
                            <div key={k}>
                                {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />}
                                <SkeletonCard />
                            </div>
                        ))}
                    </>
                ) : error || passengers.length === 0 ? (
                    selectedGroup && !error ? (
                        <EmptyState
                            onRefetch={fetchPassengers}
                            title="Este grupo todavía no tiene pasajeros"
                            hint={`Comparte el código ${selectedGroup.code} para que se unan`}
                        />
                    ) : (
                        <EmptyState onRefetch={fetchPassengers} />
                    )
                ) : (
                    passengers.map((passenger, i) => (
                        <div key={passenger._id}>
                            {i > 0 && (
                                <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />
                            )}
                            <PassengerCard
                                passenger={passenger}
                                onEdit={(p)   => setModal({ mode: 'edit',   passenger: p })}
                                onDelete={(p) => setModal({ mode: 'delete', passenger: p })}
                            />
                        </div>
                    ))
                )}
            </div>

            {modal === 'create' && (
                <PassengerModal onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'edit' && (
                <PassengerModal passenger={modal.passenger} onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'delete' && (
                <DeleteConfirmModal passenger={modal.passenger} onClose={() => setModal(null)} />
            )}
        </div>
    );
};