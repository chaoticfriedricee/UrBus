import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore.js';
import { useUserStore } from '../../users/store/userStore.js';
import { useGroupStore } from '../store/groupStore.js';
import { GroupCard } from '../components/GroupCard.jsx';
import { GroupModal } from '../components/GroupModal.jsx';
import { DeleteGroupModal } from '../components/DeleteGroupModal.jsx';
import { GroupDetailModal } from '../components/GroupDetailModal.jsx';
import { DriverLimitCard } from '../components/DriverLimitCard.jsx';
import { DefaultLimitCard } from '../components/DefaultLimitCard.jsx';
import { PassengerGroupView } from '../components/PassengerGroupView.jsx';
import {
  Banner,
  EmptyState,
  FilterChips,
  Icon,
  PageHeader,
  RefreshButton,
  SkeletonRows,
} from '../../../shared/ui/index.js';
import { navLabel } from '../../../app/layouts/navConfig.js';

const PassengerGroupsPage = ({ role }) => (
  <div className="page">
    <PageHeader
      role={role}
      title="Mi grupo"
      subtitle="Consulta tu grupo o únete a uno con el código de tu conductor."
    />
    <PassengerGroupView />
  </div>
);

const ManagerGroupsPage = ({ user, isAdmin, isDriver }) => {
  const groups = useGroupStore((s) => s.groups);
  const loading = useGroupStore((s) => s.loading);
  const error = useGroupStore((s) => s.error);
  const myLimit = useGroupStore((s) => s.myLimit);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);
  const fetchMyLimit = useGroupStore((s) => s.fetchMyLimit);
  const getActiveCount = useGroupStore((s) => s.getActiveCount);

  const allUsers = useUserStore((s) => s.users);
  const fetchUsers = useUserStore((s) => s.fetchUsers);

  const [tab, setTab] = useState('groups');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    fetchGroups();
    if (isDriver) fetchMyLimit();
    if (isAdmin) fetchUsers();
  }, [fetchGroups, fetchMyLimit, fetchUsers, isAdmin, isDriver]);

  const drivers = useMemo(() => (allUsers || []).filter((u) => u.role === 'DRIVER_ROLE'), [allUsers]);

  const activeCount = getActiveCount();
  const limitKnown = isDriver && myLimit !== null;
  const atLimit = limitKnown && activeCount >= myLimit;
  const overLimit = limitKnown && activeCount > myLimit;

  const subtitle = loading
    ? 'Cargando…'
    : isDriver
      ? limitKnown
        ? `${activeCount} de ${myLimit} grupo${myLimit === 1 ? '' : 's'} activo${myLimit === 1 ? '' : 's'}`
        : `${activeCount} grupos activos`
      : `${groups.length} grupos registrados`;

  const role = user?.role;

  return (
    <div className="page">
      <PageHeader role={role} title={navLabel(role, 'groups')} subtitle={subtitle}>
        <RefreshButton onClick={fetchGroups} disabled={loading} />
        {isDriver && (
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => setModal('create')}
            disabled={atLimit}
            title={atLimit ? `Alcanzaste el límite de ${myLimit} grupos activos` : undefined}
          >
            <Icon name="plus" size={16} strokeWidth={2.4} />
            Nuevo grupo
          </button>
        )}
      </PageHeader>

      {isDriver && !loading && atLimit && (
        <Banner tone="warning">
          {overLimit
            ? `Tienes ${activeCount} grupos activos y el límite actual es ${myLimit}. Tus grupos se conservan, pero no podrás crear ni reactivar grupos hasta tener menos de ${myLimit} activos.`
            : `Alcanzaste el límite de ${myLimit} grupo${myLimit === 1 ? '' : 's'} activo${myLimit === 1 ? '' : 's'}. Para crear otro, desactiva o elimina uno, o pide a un administrador un límite mayor.`}
        </Banner>
      )}

      {isDriver && groups.length > 0 && (
        <Banner>
          Cada grupo tiene su propio <strong>código de unión</strong>. Compártelo con tus pasajeros: lo escriben en
          «Unirme a un grupo» y quedan asignados. Toca un grupo para ver a sus pasajeros.
        </Banner>
      )}

      {isAdmin && (
        <FilterChips
          label="Vista"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'groups', label: 'Todos los grupos' },
            { value: 'limits', label: 'Límites por conductor' },
          ]}
        />
      )}

      <div className="card list">
        {tab === 'limits' && isAdmin ? (
          <>
            <DefaultLimitCard />
            {drivers.length === 0 ? (
              <EmptyState icon="users" title="No hay conductores registrados" />
            ) : (
              drivers.map((driver) => <DriverLimitCard key={driver.id} driver={driver} />)
            )}
          </>
        ) : loading ? (
          <SkeletonRows count={3} />
        ) : error || groups.length === 0 ? (
          <EmptyState
            icon="group"
            title={isDriver ? 'Todavía no has creado ningún grupo' : 'Sin grupos registrados'}
            text={isDriver ? 'Crea tu primer grupo y comparte su código con tus pasajeros.' : undefined}
            actionLabel={isDriver && !atLimit ? 'Crear grupo' : undefined}
            onAction={() => setModal('create')}
          />
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group._id}
              group={group}
              canManage={isAdmin || (isDriver && group.driverId === (user?.id || user?._id))}
              onView={(g) => setModal({ mode: 'detail', group: g })}
              onEdit={(g) => setModal({ mode: 'edit', group: g })}
              onDelete={(g) => setModal({ mode: 'delete', group: g })}
              onToggleActive={(g) => useGroupStore.getState().toggleGroupActive(g._id)}
            />
          ))
        )}
      </div>

      {modal === 'create' && <GroupModal onClose={() => setModal(null)} />}
      {modal?.mode === 'edit' && <GroupModal group={modal.group} onClose={() => setModal(null)} />}
      {modal?.mode === 'delete' && <DeleteGroupModal group={modal.group} onClose={() => setModal(null)} />}
      {modal?.mode === 'detail' && <GroupDetailModal groupId={modal.group._id} onClose={() => setModal(null)} />}
    </div>
  );
};

export const GroupListPage = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN_ROLE';
  const isDriver = user?.role === 'DRIVER_ROLE';

  if (!isAdmin && !isDriver) return <PassengerGroupsPage role={user?.role} />;

  return <ManagerGroupsPage user={user} isAdmin={isAdmin} isDriver={isDriver} />;
};
