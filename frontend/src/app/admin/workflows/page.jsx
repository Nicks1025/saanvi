"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import WorkflowsFeature from '@/features/admin/communication/WorkflowsFeature';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermissions={['admin.workflows.view']}>
      <AppLayout>
        <WorkflowsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
