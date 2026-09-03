"use client";
import React from 'react';
import RolesFeature from '@/features/admin/roles/RolesFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.roles.view">
      <AppLayout>
        <RolesFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
