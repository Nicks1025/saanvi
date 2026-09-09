"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import FullScreenLoader from '@/components/common/FullScreenLoader';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    } else if (!loading && isAuthenticated && requiredPermission && user) {
      const hasPermission = user.permissions && user.permissions.includes(requiredPermission);
      if (!hasPermission) {
        // Redirect to unauthorized page if the user lacks permissions
        router.replace('/unauthorized'); 
      }
    }
  }, [loading, isAuthenticated, requiredPermission, user, router]);

  if (loading) {
    return <FullScreenLoader message="Loading session..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && user) {
    const hasPermission = user.permissions && user.permissions.includes(requiredPermission);
    if (!hasPermission) {
      return null;
    }
  }

  return children;
};

export default ProtectedRoute;
