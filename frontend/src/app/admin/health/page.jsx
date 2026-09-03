"use client";
import React from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import SystemHealthFeature from '@/features/admin/health/SystemHealthFeature';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.system.health">
      <AppLayout>
        <SystemHealthFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
