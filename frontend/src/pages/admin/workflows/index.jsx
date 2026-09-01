import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import WorkflowsFeature from '../../../features/admin/communication/WorkflowsFeature';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const WorkflowsPage = () => {
  return (
    <ProtectedRoute requiredPermissions={['admin.workflows.view']}>
      <AppLayout>
        <WorkflowsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WorkflowsPage;
