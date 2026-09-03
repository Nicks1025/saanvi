"use client";
import React from 'react';
import SystemEventsFeature from '@/features/admin/communication/SystemEventsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.workflows.view">
      <AppLayout>
        <SystemEventsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
