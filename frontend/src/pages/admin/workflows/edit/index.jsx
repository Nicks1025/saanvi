import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import WorkflowEditor from '../../../../features/admin/communication/WorkflowEditor';

const WorkflowEditPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.workflows.edit">
      <AppLayout>
        <WorkflowEditor mode="edit" />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WorkflowEditPage;
