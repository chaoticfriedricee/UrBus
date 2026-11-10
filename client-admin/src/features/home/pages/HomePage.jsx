import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore.js';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { usePassengerStore } from '../../passangers/store/passengerStore.js';
import { usePostStore } from '../../post/store/postStore.js';
import { useUserStore } from '../../users/store/userStore.js';
import { Banner, EmptyState, Icon, PageHeader } from '../../../shared/ui/index.js';
import { isAdminRole, isManagerRole } from '../../../shared/utils/roles.js';
import { navLabel } from '../../../app/layouts/navConfig.js';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const timeAgo = (value) => {
  const diff = Math.floor((Date.now() - new Date(value)) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
};

const SUBTITLES = {
  ADMIN_ROLE: 'Así va la operación de UrBus hoy.',
  DRIVER_ROLE: 'Tu resumen del día antes de salir a ruta.',
  PASSENGER_ROLE: 'Todo lo de tu ruta en un solo vistazo.',
  USER_ROLE: 'Todo lo de tu ruta en un solo vistazo.',
};

const StatCard = ({ to, icon, value, label, hint }) => (
  <Link to={to} className="stat">
    <span className="tile">
      <Icon name={icon} size={22} />
    </span>
    <span className="stat-body">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </span>
    <Icon name="chevron" size={18} className="stat-go" />
  </Link>
);

const RecentPosts = ({ posts, role }) => {
  const recent = posts.filter((post) => !post.isDeleted).slice(0, 3);

  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">Últimos {navLabel(role, 'posts').toLowerCase()}</h2>
        <Link to="/dashboard/posts" className="link" style={{ fontSize: 14 }}>
          Ver todos
        </Link>
      </div>
      <div className="card list">
        {recent.length === 0 ? (
          <EmptyState icon="megaphone" title="Sin anuncios por ahora" text="Cuando haya un aviso nuevo lo verás aquí." />
        ) : (
          recent.map((post) => (
            <Link
              key={post._id}
              to="/dashboard/posts"
              className="row is-clickable"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <div className="row-main">
                <span className="tile">
                  <Icon name="megaphone" size={22} />
                </span>
                <div className="row-body">
                  <p className="row-title">{post.title}</p>
                  <p className="row-meta">{timeAgo(post.createdAt)}</p>
                </div>
                {post.isUrgent && <span className="badge badge-orange">Urgente</span>}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
};

const ManagerHome = ({ role }) => {
  const isAdmin = isAdminRole(role);
  const groups = useGroupStore((s) => s.groups);
  const fetchGroups = useGroupStore((s) => s.fetchGroups);
  const passengers = usePassengerStore((s) => s.passengers);
  const selectedGroupId = usePassengerStore((s) => s.selectedGroupId);
  const selectGroup = usePassengerStore((s) => s.selectGroup);
  const fetchPassengers = usePassengerStore((s) => s.fetchPassengers);
  const users = useUserStore((s) => s.users);
  const fetchUsers = useUserStore((s) => s.fetchUsers);
  const posts = usePostStore((s) => s.posts);

  useEffect(() => {
    fetchGroups();
    if (selectedGroupId) selectGroup(null);
    else fetchPassengers();
    if (isAdmin) fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeGroups = groups.filter((group) => group.isActive).length;
  const present = passengers.filter((passenger) => passenger.status === 'PRESENT').length;
  const activePosts = (Array.isArray(posts) ? posts : []).filter((post) => !post.isDeleted);
  const urgent = activePosts.filter((post) => post.isUrgent).length;
  const unverified = (users || []).filter((user) => !user.isEmailVerified).length;

  return (
    <>
      <div className="hero">
        <div>
          <span className="eyebrow">{isAdmin ? 'Mapa en vivo' : 'Tu ruta'}</span>
          <h2 className="hero-title">{isAdmin ? 'Sigue cada recorrido en tiempo real' : 'Inicia tu recorrido cuando estés listo'}</h2>
          <p className="hero-text">
            {isAdmin
              ? 'Abre el mapa para ver dónde está cada bus y si el GPS sigue activo.'
              : 'Elige tu grupo, marca el destino en el mapa y avisa a tus pasajeros que vas en camino.'}
          </p>
        </div>
        <Link to="/dashboard/location" className="btn btn-accent btn-lg">
          <Icon name={isAdmin ? 'map' : 'play'} size={18} />
          {isAdmin ? 'Abrir el mapa' : 'Ir a mi ruta'}
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard
          to="/dashboard/groups"
          icon="group"
          value={groups.length ? `${activeGroups}` : '0'}
          label={isAdmin ? 'Grupos activos' : 'Mis grupos activos'}
          hint={groups.length ? `${groups.length} en total` : 'Todavía sin grupos'}
        />
        <StatCard
          to="/dashboard/passengers"
          icon="users"
          value={`${present}/${passengers.length}`}
          label="Pasajeros presentes"
          hint="Asistencia de hoy"
        />
        <StatCard
          to="/dashboard/posts"
          icon="megaphone"
          value={activePosts.length}
          label="Anuncios activos"
          hint={urgent ? `${urgent} urgente${urgent === 1 ? '' : 's'}` : 'Ninguno urgente'}
        />
        {isAdmin && (
          <StatCard
            to="/dashboard/users"
            icon="shield"
            value={users.length}
            label="Usuarios registrados"
            hint={unverified ? `${unverified} sin verificar` : 'Todos verificados'}
          />
        )}
      </div>

      <RecentPosts posts={Array.isArray(posts) ? posts : []} role={role} />
    </>
  );
};

const PassengerHome = ({ role }) => {
  const myPassenger = useGroupStore((s) => s.myPassenger);
  const loading = useGroupStore((s) => s.myPassengerLoading);
  const notLinked = useGroupStore((s) => s.notLinked);
  const fetchMyPassenger = useGroupStore((s) => s.fetchMyPassenger);
  const posts = usePostStore((s) => s.posts);

  useEffect(() => {
    fetchMyPassenger();
  }, [fetchMyPassenger]);

  const group = myPassenger?.groupId ?? null;
  const isPresent = myPassenger?.status === 'PRESENT';

  return (
    <>
      {loading && !myPassenger && !notLinked ? (
        <div className="hero">
          <p className="hero-text">Cargando tu grupo…</p>
        </div>
      ) : group ? (
        <div className="hero">
          <div>
            <span className="eyebrow">Tu grupo</span>
            <h2 className="hero-title">{group.name}</h2>
            <div className="hero-meta">
              <span className="code-ticket">{group.code}</span>
              <span className={`badge ${isPresent ? 'badge-green' : ''}`}>{isPresent ? 'Presente hoy' : 'Ausente hoy'}</span>
              {!group.isActive && <span className="badge badge-yellow">Grupo inactivo</span>}
            </div>
          </div>
          <Link to="/dashboard/location" className="btn btn-accent btn-lg">
            <Icon name="map" size={18} />
            Ver el bus en vivo
          </Link>
        </div>
      ) : (
        <>
          <Banner>
            <strong>Todavía no perteneces a ningún grupo.</strong> Escribe el código que te dio tu conductor para ver el bus,
            a tus compañeros y los avisos de tu ruta.
          </Banner>
          <div className="hero">
            <div>
              <span className="eyebrow">Primer paso</span>
              <h2 className="hero-title">Únete al grupo de tu bus</h2>
            </div>
            <Link to="/dashboard/groups" className="btn btn-accent btn-lg">
              <Icon name="plus" size={18} strokeWidth={2.4} />
              Unirme con un código
            </Link>
          </div>
        </>
      )}

      <RecentPosts posts={Array.isArray(posts) ? posts : []} role={role} />
    </>
  );
};

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const firstName = user?.name || user?.username || '';

  return (
    <div className="page">
      <PageHeader role={role} title={`${greeting()}${firstName ? `, ${firstName}` : ''}`} subtitle={SUBTITLES[role]} />
      {isManagerRole(role) ? <ManagerHome role={role} /> : <PassengerHome role={role} />}
    </div>
  );
};

