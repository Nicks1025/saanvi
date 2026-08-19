import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && user) {
    const hasPermission = user.permissions && user.permissions.includes(requiredPermission);
    if (!hasPermission) {
      return <Navigate to="/not-found" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
