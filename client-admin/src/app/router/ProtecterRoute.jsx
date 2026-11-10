import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { Spinner } from '../../features/auth/components/Spinner.jsx';

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingAuth = useAuthStore((state) => state.isLoadingAuth);

  if (isLoadingAuth) {
    return (
      <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
        <Spinner size={30} />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to='/' replace />;

  return children;
};
