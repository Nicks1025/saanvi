import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import SqlEditorFeature from '../../../features/admin/sql-editor/SqlEditorFeature';

const SqlEditorPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.sql_editor">
      <AppLayout>
        <SqlEditorFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default SqlEditorPage;
