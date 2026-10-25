import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore.js";
import { usePostStore } from "../../features/post/store/postStore.js";
import { styles } from "../../styles/dashboard.js";
import { ProfileModal } from "../../features/auth/components/ProfileModal.jsx";
import userDefault from "../../assets/img/user.png";
import urBusLogo from "../../assets/img/UrBus-logo.png";

const authBaseUrl = import.meta.env.VITE_AUTH_URL?.replace(/\/api\/v1\/?$/, '');

const normalizeCloudinaryUrl = (url) => {
  if (!url) return url;
  return url.replace(/(\/v\d+)(?!\/)/, '$1/');
};

const normalizeProfilePicture = (url) => {
  if (!url) return null;
  if (/^(https?:)?\/\//.test(url)) {
    const resolved = url.startsWith('//') ? `https:${url}` : url;
    return normalizeCloudinaryUrl(resolved);
  }
  if (url.startsWith('/')) return normalizeCloudinaryUrl(`${authBaseUrl}${url}`);
  return normalizeCloudinaryUrl(`${authBaseUrl}/${url}`);
};

const ROLE_LABELS = {
  ADMIN_ROLE: "Administrador",
  PASSENGER_ROLE: "Pasajero",
  DRIVER_ROLE: "Conductor",
  USER_ROLE: "Usuario",
};

const NAV_ITEMS = [
  {
    label: "Mapa en Vivo",
    path: "/dashboard/location",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    label: "Pasajeros",
    path: "/dashboard/passengers",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeLinecap="round" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Publicaciones",
    path: "/dashboard/posts",
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
        <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
        <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Grupos",
    path: "/dashboard/groups",
    roles: ["ADMIN_ROLE", "DRIVER_ROLE", "PASSENGER_ROLE", "USER_ROLE"],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Usuarios",
    path: "/dashboard/users",
    adminOnly: true,
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" />
      </svg>
    ),
  },
];

export const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const fetchPosts = usePostStore((state) => state.fetchPosts);
  const hasUnreadUrgent = usePostStore((state) => state.hasUnreadUrgent());

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const avatarLetter = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.role === "ADMIN_ROLE"
    ? "A"
    : "U";

  const currentPage = NAV_ITEMS.find((item) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  );
  const pageTitle = currentPage?.label ?? "Panel de Administración";

  return (
    <div style={styles.root}>
      <style>{`
        .profile-trigger { cursor: pointer; transition: opacity 0.15s; }
        .profile-trigger:hover { opacity: 0.8; }
        .sidebar-profile-trigger {
          cursor: pointer;
          transition: background 0.15s;
          border-radius: 10px;
          padding: 2px 4px;
        }
        .sidebar-profile-trigger:hover { background: rgba(255,255,255,0.07); }
        .header-user-btn {
          display: flex; align-items: center; gap: 8px;
          background: transparent; border: none; cursor: pointer;
          padding: 4px 8px; border-radius: 8px;
          transition: background 0.15s;
        }
        .header-user-btn:hover { background: #f3f4f6; }
      `}</style>

      {isMobile && sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                height: "100vh",
                zIndex: 50,
                transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.25s ease",
              }
            : {}),
        }}
      >
        <div style={styles.logoArea}>
          <img
            src={urBusLogo}
            alt="UrBus logo"
            style={{
              width: 42,
              height: 42,
              objectFit: "contain",
              borderRadius: 10,
              flexShrink: 0,
            }}
          />
          <span style={styles.logoText}>UrBus</span>
        </div>

        <nav style={styles.nav}>
          <p style={styles.navGroup}>Principal</p>
          {NAV_ITEMS.filter((item) =>
            (!item.adminOnly || user?.role === "ADMIN_ROLE") &&
            (!item.roles || item.roles.includes(user?.role))
          ).map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                style={{ textDecoration: "none" }}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <div
                  style={{
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.navIcon,
                      color: isActive ? "#005691" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      ...styles.navLabel,
                      color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                      fontWeight: isActive ? "600" : "400",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {item.label}
                    {item.path === "/dashboard/posts" && hasUnreadUrgent && (
                      <span
                        title="Hay anuncios urgentes sin revisar"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                          boxShadow: "0 0 0 2px rgba(239,68,68,0.25)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </span>
                  {isActive && <span style={styles.activeBar} />}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Usuario en sidebar — clickeable para abrir perfil */}
        <div
          className="sidebar-profile-trigger"
          style={styles.sidebarUser}
          onClick={() => setProfileOpen(true)}
          title="Ver mi perfil"
        >
          <img
            src={normalizeProfilePicture(user?.profilePicture) || userDefault}
            alt="Avatar"
            style={{ ...styles.sidebarAvatar, objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = userDefault; }}
          />
          <div style={styles.sidebarUserInfo}>
            <p style={styles.sidebarUserName}>{user?.name ?? "Usuario"}</p>
            <p style={styles.sidebarUserRole}>
              {ROLE_LABELS[user?.role] ?? "Usuario"}
            </p>
          </div>
          <svg
            width="12" height="12" fill="none" stroke="rgba(255,255,255,0.35)"
            strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}
          >
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </div>
      </aside>

      {/* MAIN */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {isMobile && (
              <button style={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <span style={styles.pageTitle}>{pageTitle}</span>
          </div>

          <div style={styles.headerRight}>
            {/* Avatar + nombre clickeable → abre perfil */}
            <button
              className="header-user-btn"
              onClick={() => setProfileOpen(true)}
              title="Mi perfil"
            >
              <img
                src={normalizeProfilePicture(user?.profilePicture) || userDefault}
                alt="Avatar"
                style={{ ...styles.avatar, objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = userDefault; }}
              />
              {!isMobile && (
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  {user?.name ?? 'Usuario'}
                </span>
              )}
            </button>

            <button style={styles.logoutBtn} onClick={handleLogout}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {!isMobile && "Salir"}
            </button>
          </div>
        </header>

        <main style={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Modal de perfil */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
};