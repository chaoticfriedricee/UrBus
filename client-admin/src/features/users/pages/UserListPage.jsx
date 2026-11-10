import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore.js';
import { useUserStore } from '../store/userStore.js';
import { UserCard } from '../components/UserCard.jsx';
import { EmptyState, FilterChips, PageHeader, RefreshButton, SkeletonRows } from '../../../shared/ui/index.js';

const ROLE_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ADMIN_ROLE', label: 'Administradores' },
  { value: 'DRIVER_ROLE', label: 'Conductores' },
  { value: 'PASSENGER_ROLE', label: 'Pasajeros' },
  { value: 'USER_ROLE', label: 'Usuarios' },
];

export const UserListPage = () => {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || currentUser?._id;

  const users = useUserStore((s) => s.users);
  const loading = useUserStore((s) => s.loading);
  const error = useUserStore((s) => s.error);
  const fetchUsers = useUserStore((s) => s.fetchUsers);

  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'ALL') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const options = ROLE_FILTERS.map((filter) => ({
    ...filter,
    count: filter.value === 'ALL' ? users.length : users.filter((u) => u.role === filter.value).length,
  }));

  return (
    <div className="page">
      <PageHeader
        role={currentUser?.role}
        title="Usuarios y roles"
        subtitle={
          loading
            ? 'Cargando…'
            : error
              ? 'No se pudieron cargar los datos'
              : `Mostrando ${filteredUsers.length} de ${users.length} usuarios`
        }
      >
        <RefreshButton onClick={fetchUsers} disabled={loading} />
      </PageHeader>

      <FilterChips label="Filtrar por rol" options={options} value={roleFilter} onChange={setRoleFilter} />

      <div className="card list">
        {loading ? (
          <SkeletonRows count={5} round />
        ) : error || filteredUsers.length === 0 ? (
          <EmptyState
            icon="user"
            title="No se encontraron usuarios"
            text="Prueba con otro filtro o actualiza la lista."
            actionLabel="Reintentar"
            onAction={fetchUsers}
          />
        ) : (
          filteredUsers.map((u) => <UserCard key={u.id} user={u} currentUserId={currentUserId} />)
        )}
      </div>
    </div>
  );
};
