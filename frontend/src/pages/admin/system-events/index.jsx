import React from 'react';
import SystemEventsFeature from '../../../features/admin/communication/SystemEventsFeature';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const SystemEventsPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.workflows.view">
      <AppLayout>
        <SystemEventsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default SystemEventsPage;
