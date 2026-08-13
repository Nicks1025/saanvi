import React from 'react';
import UserDetailsFeature from '../../../features/admin/users/UserDetailsFeature';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const UserDetailsPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.users">
      <AppLayout>
        <UserDetailsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default UserDetailsPage;
