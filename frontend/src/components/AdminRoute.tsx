import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const auth = useSelector((state: RootState) => state.auth);

  // Check if user is authenticated
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin role
  if (auth.user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Check if user has admin permission
  const hasAdminPermission = auth.user?.permissions?.includes('admin') || 
                            auth.user?.role === 'admin';

  if (!hasAdminPermission) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;