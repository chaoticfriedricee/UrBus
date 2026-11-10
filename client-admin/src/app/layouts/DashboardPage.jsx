import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { usePostStore } from '../../features/post/store/postStore.js';
import { ProfileModal } from '../../features/auth/components/ProfileModal.jsx';
import { Avatar, Icon, RolePill } from '../../shared/ui/index.js';
import { normalizeProfilePicture } from '../../shared/utils/profilePicture.js';
import { itemsForRole } from './navConfig.js';
import urbusLogo from '../../assets/img/UrBus-logo.png';

const UserAvatar = ({ user, size }) => {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : normalizeProfilePicture(user?.profilePicture);
  const name = [user?.name, user?.surname].filter(Boolean).join(' ') || user?.username;

  return <Avatar name={name} src={src} size={size} onError={() => setFailed(true)} />;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const fetchPosts = usePostStore((state) => state.fetchPosts);
  const hasUnreadUrgent = usePostStore((state) => state.hasUnreadUrgent());

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const role = user?.role;
  const items = itemsForRole(role).map((item) => ({
    ...item,
    label: item.labels[role] ?? item.labels.default,
  }));

  const isActive = (item) =>
    item.exact
      ? location.pathname.replace(/\/$/, '') === item.path
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  const current = items.find((item) => isActive(item)) ?? items[0];
  const fullName = [user?.name, user?.surname].filter(Boolean).join(' ') || user?.username || 'Usuario';
  const isMap = current?.key === 'map';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderItems = () =>
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end
        className={`nav-item ${isActive(item) ? 'is-active' : ''}`}
        aria-current={isActive(item) ? 'page' : undefined}
      >
        <span className="nav-stop" />
        <Icon name={item.icon} size={22} className="nav-icon" />
        <span className="nav-text">
          <span className="label-full">{item.label}</span>
          <span className="label-short">{item.short ?? item.label}</span>
          {item.key === 'posts' && hasUnreadUrgent && (
            <span className="alert-dot" title="Hay anuncios urgentes sin revisar" />
          )}
        </span>
      </NavLink>
    ));

  return (
    <div className="app" data-role={role}>
      <aside className="sidebar">
        <div className="brand">
          <img src={urbusLogo} alt="" />
          <span className="brand-name">UrBus</span>
        </div>

        <p className="eyebrow nav-label">Menú</p>
        <nav className="nav" aria-label="Principal">
          {renderItems()}
        </nav>

        <div className="side-foot">
          <button type="button" className="profile-btn" onClick={() => setProfileOpen(true)} title={`${fullName} · Ver mi perfil`}>
            <UserAvatar user={user} />
            <span className="profile-info">
              <span className="profile-name">{fullName}</span>
              <RolePill role={role} />
            </span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="topbar">
        <div className="topbar-brand">
          <img src={urbusLogo} alt="" />
          <span className="topbar-title">UrBus</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Cerrar sesión">
            <Icon name="logout" />
          </button>
          <button type="button" className="avatar-btn" onClick={() => setProfileOpen(true)} aria-label="Mi perfil">
            <UserAvatar user={user} size="avatar-sm" />
          </button>
        </div>
      </header>

      <main className={`main ${isMap ? 'is-map' : ''}`}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Principal">
        {renderItems()}
      </nav>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
};
