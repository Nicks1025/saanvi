import React from 'react';
import RolesFeature from '../../../features/admin/roles/RolesFeature';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const RolesPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.roles">
      <AppLayout>
        <RolesFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default RolesPage;
