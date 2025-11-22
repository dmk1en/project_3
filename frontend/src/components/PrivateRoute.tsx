import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Spin } from 'antd';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'sales_rep' | 'analyst';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const auth = useSelector((state: RootState) => state.auth);

  // Show loading spinner while auth state is being determined
  if (auth.loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!auth.isAuthenticated || !auth.accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if required
  if (requiredRole && auth.user?.role) {
    const roleHierarchy = {
      'admin': 4,
      'manager': 3,
      'sales_rep': 2,
      'analyst': 1
    };

    const userRoleLevel = roleHierarchy[auth.user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      // User doesn't have sufficient permissions
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column' 
        }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;
