import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore.js';
import { useUserStore } from '../../users/store/userStore.js';
import { useGroupStore } from '../store/groupStore.js';
import { GroupCard } from '../components/GroupCard.jsx';
import { GroupModal } from '../components/GroupModal.jsx';
import { DeleteGroupModal } from '../components/DeleteGroupModal.jsx';
import { GroupDetailModal } from '../components/GroupDetailModal.jsx';
import { DriverLimitCard } from '../components/DriverLimitCard.jsx';

function SkeletonCard() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', background: '#fff',
        }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0f0f0', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ height: 14, width: '48%', background: '#f0f0f0', borderRadius: 6 }} />
                <div style={{ height: 12, width: '32%', background: '#f0f0f0', borderRadius: 6 }} />
            </div>
        </div>
    );
}

function EmptyState({ message, actionLabel, onAction }) {
    return (
        <div style={{ textAlign: 'center', padding: '52px 20px' }}>
            <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
                <svg width="30" height="30" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" />
                </svg>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#374151' }}>
                {message}
            </p>
            {actionLabel && (
                <button
                    onClick={onAction}
                    style={{
                        padding: '9px 22px', borderRadius: 10, border: 'none',
                        background: '#005691', color: '#fff', fontSize: 13,
                        fontWeight: 600, cursor: 'pointer', marginTop: 10,
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export const GroupListPage = () => {
    const user    = useAuthStore((s) => s.user);
    const isAdmin  = user?.role === 'ADMIN_ROLE';
    const isDriver = user?.role === 'DRIVER_ROLE';

    const groups        = useGroupStore((s) => s.groups);
    const loading        = useGroupStore((s) => s.loading);
    const error          = useGroupStore((s) => s.error);
    const myLimit        = useGroupStore((s) => s.myLimit);
    const fetchGroups    = useGroupStore((s) => s.fetchGroups);
    const fetchMyLimit   = useGroupStore((s) => s.fetchMyLimit);
    const getActiveCount = useGroupStore((s) => s.getActiveCount);

    const allUsers    = useUserStore((s) => s.users);
    const fetchUsers   = useUserStore((s) => s.fetchUsers);

    const [tab, setTab] = useState('groups');
    const [modal, setModal] = useState(null);

    useEffect(() => {
        fetchGroups();
        if (isDriver) fetchMyLimit();
        if (isAdmin) fetchUsers();
    }, [fetchGroups, fetchMyLimit, fetchUsers, isAdmin, isDriver]);

    const drivers = useMemo(
        () => (allUsers || []).filter((u) => u.role === 'DRIVER_ROLE'),
        [allUsers]
    );

    const activeCount = getActiveCount();
    const atLimit = isDriver && activeCount >= myLimit;

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
                        Grupos
                    </h1>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>
                        {loading
                            ? 'Cargando...'
                            : isDriver
                                ? `${activeCount} de ${myLimit} grupos usados`
                                : `${groups.length} grupos registrados`}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={fetchGroups}
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

                    {isDriver && (
                        <button
                            onClick={() => setModal('create')}
                            disabled={atLimit}
                            title={atLimit ? 'Alcanzaste el límite de grupos permitido' : undefined}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 10, border: 'none',
                                background: atLimit ? '#93c5fd' : '#005691', color: '#fff',
                                fontSize: 13, fontWeight: 600, cursor: atLimit ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nuevo grupo
                        </button>
                    )}
                </div>
            </div>

            {isAdmin && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {[
                        { value: 'groups', label: 'Todos los grupos' },
                        { value: 'limits', label: 'Límites por conductor' },
                    ].map((t) => (
                        <button
                            key={t.value}
                            onClick={() => setTab(t.value)}
                            style={{
                                padding: '7px 14px', borderRadius: 999,
                                border: tab === t.value ? 'none' : '1.5px solid #e5e7eb',
                                background: tab === t.value ? '#005691' : '#fff',
                                color: tab === t.value ? '#fff' : '#374151',
                                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            <div style={{
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                overflow: 'hidden',
                border: '1px solid #f0f0f0',
            }}>
                {tab === 'limits' && isAdmin ? (
                    drivers.length === 0 ? (
                        <EmptyState message="No hay conductores registrados" />
                    ) : (
                        drivers.map((d, i) => (
                            <div key={d.id}>
                                {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />}
                                <DriverLimitCard driver={d} />
                            </div>
                        ))
                    )
                ) : loading ? (
                    <>
                        {[1, 2, 3].map((k, i) => (
                            <div key={k}>
                                {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />}
                                <SkeletonCard />
                            </div>
                        ))}
                    </>
                ) : error || groups.length === 0 ? (
                    <EmptyState
                        message={isDriver ? 'Todavía no has creado ningún grupo' : 'Sin grupos registrados'}
                        actionLabel={isDriver && !atLimit ? 'Crear grupo' : undefined}
                        onAction={() => setModal('create')}
                    />
                ) : (
                    groups.map((group, i) => (
                        <div key={group._id}>
                            {i > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 18px' }} />}
                            <GroupCard
                                group={group}
                                canManage={isAdmin || (isDriver && group.driverId === (user?.id || user?._id))}
                                onView={(g) => setModal({ mode: 'detail', group: g })}
                                onEdit={(g) => setModal({ mode: 'edit', group: g })}
                                onDelete={(g) => setModal({ mode: 'delete', group: g })}
                                onToggleActive={(g) => useGroupStore.getState().toggleGroupActive(g._id)}
                            />
                        </div>
                    ))
                )}
            </div>

            {modal === 'create' && (
                <GroupModal onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'edit' && (
                <GroupModal group={modal.group} onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'delete' && (
                <DeleteGroupModal group={modal.group} onClose={() => setModal(null)} />
            )}
            {modal?.mode === 'detail' && (
                <GroupDetailModal groupId={modal.group._id} onClose={() => setModal(null)} />
            )}
        </div>
    );
};
