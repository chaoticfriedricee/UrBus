import { useEffect, useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore.js';
import { usePassengerStore } from '../store/passengerStore.js';
import { PassengerCard } from '../components/PassengerCard.jsx';
import { PassengerModal } from '../components/PassengerModal.jsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.jsx';
import { GroupFilter } from '../components/GroupFilter.jsx';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { EmptyState, Icon, PageHeader, RefreshButton, SkeletonRows } from '../../../shared/ui/index.js';
import { navLabel } from '../../../app/layouts/navConfig.js';

export const PassengerListPage = () => {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isAdmin = role === 'ADMIN_ROLE';
  const canFilter = isAdmin || role === 'DRIVER_ROLE';

  const passengers = usePassengerStore((s) => s.passengers);
  const loading = usePassengerStore((s) => s.loading);
  const error = usePassengerStore((s) => s.error);
  const fetchPassengers = usePassengerStore((s) => s.fetchPassengers);
  const getPresentCount = usePassengerStore((s) => s.getPresentCount);
  const selectedGroupId = usePassengerStore((s) => s.selectedGroupId);
  const selectGroup = usePassengerStore((s) => s.selectGroup);

  const groups = useGroupStore((s) => s.groups);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);

  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!canFilter && selectedGroupId) selectGroup(null);
    else fetchPassengers();
    if (canFilter) fetchGroups();
  }, [fetchPassengers, fetchGroups, canFilter]);

  const selectedGroup = canFilter ? groups.find((g) => g._id === selectedGroupId) : null;
  const countLabel = canFilter
    ? `${getPresentCount()} de ${passengers.length} presentes`
    : `${passengers.length} compañeros de grupo`;

  const subtitle = loading
    ? 'Cargando…'
    : error
      ? 'No se pudieron cargar los datos'
      : selectedGroup
        ? `${selectedGroup.name} · ${countLabel}`
        : countLabel;

  return (
    <div className="page">
      <PageHeader role={role} title={navLabel(role, 'passengers')} subtitle={subtitle}>
        {isAdmin && (
          <>
            <RefreshButton onClick={fetchPassengers} disabled={loading} />
            <button type="button" className="btn btn-accent" onClick={() => setModal('create')}>
              <Icon name="plus" size={16} strokeWidth={2.4} />
              Nuevo pasajero
            </button>
          </>
        )}
      </PageHeader>

      {canFilter && groups.length > 0 && (
        <GroupFilter groups={groups} selectedGroupId={selectedGroup ? selectedGroupId : null} onSelect={selectGroup} />
      )}

      <div className="card list">
        {loading ? (
          <SkeletonRows count={5} round />
        ) : error || passengers.length === 0 ? (
          selectedGroup && !error ? (
            <EmptyState
              icon="users"
              title="Este grupo todavía no tiene pasajeros"
              text={`Comparte el código ${selectedGroup.code} para que se unan.`}
              actionLabel="Reintentar"
              onAction={fetchPassengers}
            />
          ) : (
            <EmptyState
              icon="users"
              title={canFilter ? 'Sin pasajeros registrados' : 'Aún no hay compañeros para mostrar'}
              text={canFilter ? undefined : 'Cuando te unas a un grupo, verás aquí a quienes viajan contigo.'}
              actionLabel="Reintentar"
              onAction={fetchPassengers}
            />
          )
        ) : (
          passengers.map((passenger) => (
            <PassengerCard
              key={passenger._id}
              passenger={passenger}
              onEdit={(p) => setModal({ mode: 'edit', passenger: p })}
              onDelete={(p) => setModal({ mode: 'delete', passenger: p })}
            />
          ))
        )}
      </div>

      {modal === 'create' && <PassengerModal onClose={() => setModal(null)} />}
      {modal?.mode === 'edit' && <PassengerModal passenger={modal.passenger} onClose={() => setModal(null)} />}
      {modal?.mode === 'delete' && <DeleteConfirmModal passenger={modal.passenger} onClose={() => setModal(null)} />}
    </div>
  );
};
