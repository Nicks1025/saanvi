"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import WorkflowEditor from '@/features/admin/communication/WorkflowEditor';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.workflows.view">
      <AppLayout>
        <WorkflowEditor mode="view" />
      </AppLayout>
    </ProtectedRoute>
  );
}
