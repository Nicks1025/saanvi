import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import WorkflowEditor from '../../../../features/admin/communication/WorkflowEditor';

const WorkflowCreatePage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.workflows.edit">
      <AppLayout>
        <WorkflowEditor mode="create" />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WorkflowCreatePage;
