import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import DynamicVariablesList from '../../../features/admin/communication/dynamicVariables/DynamicVariablesList';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const DynamicVariablesPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.dynamic_variables.view">
      <AppLayout>
        <DynamicVariablesList />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DynamicVariablesPage;
