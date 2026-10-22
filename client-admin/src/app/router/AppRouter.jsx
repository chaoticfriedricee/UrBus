import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from '../layouts/DashboardPage.jsx';
import { ProtectedRoute } from './ProtecterRoute.jsx';
import { RoleGuard } from './RoleGuard.jsx';
import { AuthPage } from '../../features/auth/pages/AuthPage.jsx';
import { VerifyEmailPage } from '../../features/auth/pages/VerifyEmailPage.jsx';
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage.jsx';
import { LocationPage } from '../../features/location/pages/LocationPage.jsx';
import { PassengerListPage } from '../../features/passangers/pages/PassengerListPage.jsx';
import { GroupListPage } from '../../features/groups/pages/GroupListPage.jsx';
import { PostListPage } from '../../features/post/pages/PostListPage.jsx';
import { UserListPage } from '../../features/users/pages/UserListPage.jsx';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path='/' element={<AuthPage />} />
      <Route path='/auth' element={<AuthPage />} />
      <Route path='/auth/login' element={<AuthPage />} />
      <Route path='/auth/register' element={<AuthPage />} />

      <Route path='/verify-email' element={<VerifyEmailPage />} />
      <Route path='/reset-password' element={<ResetPasswordPage />} />

      <Route
        path='/dashboard'
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<LocationPage />} />
        <Route path='location' element={<LocationPage />} />
        <Route path='passengers' element={<PassengerListPage />} />
        <Route
          path='groups'
          element={
            <RoleGuard allowedRoles={['ADMIN_ROLE', 'DRIVER_ROLE']}>
              <GroupListPage />
            </RoleGuard>
          }
        />
        <Route path='posts' element={<PostListPage />} />
        <Route
          path='users'
          element={
            <RoleGuard allowedRoles={['ADMIN_ROLE']}>
              <UserListPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
};