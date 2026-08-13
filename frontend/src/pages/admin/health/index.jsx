import React from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import AppLayout from '../../../components/layout/AppLayout';
import SystemHealthFeature from '../../../features/admin/health/SystemHealthFeature';

const SystemHealthPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.system.health">
      <AppLayout>
        <SystemHealthFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default SystemHealthPage;
