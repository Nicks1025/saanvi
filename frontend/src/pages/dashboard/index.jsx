import React from 'react';
import AppLayout from '../../components/layout/AppLayout';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import DashboardFeature from '../../features/dashboard/DashboardFeature';

const DashboardPage = () => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <DashboardFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DashboardPage;
