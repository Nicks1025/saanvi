import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import WorkflowEditor from '../../../../features/admin/communication/WorkflowEditor';

const WorkflowViewPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.workflows.view">
      <AppLayout>
        <WorkflowEditor mode="view" />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WorkflowViewPage;
