import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import AddUserFeature from '../../../features/admin/users/AddUserFeature';

const AddUserPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.users.create">
      <AppLayout>
        <AddUserFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default AddUserPage;
