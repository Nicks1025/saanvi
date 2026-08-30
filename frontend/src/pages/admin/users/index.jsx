import React from 'react';
import UsersFeature from '../../../features/admin/users/UsersFeature';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const UsersPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.users.view">
      <AppLayout>
        <UsersFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default UsersPage;
