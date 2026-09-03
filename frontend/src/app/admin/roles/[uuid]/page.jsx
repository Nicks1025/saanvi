"use client";
import React from 'react';
import RoleDetailsFeature from '@/features/admin/roles/RoleDetailsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.roles.view">
      <AppLayout>
        <RoleDetailsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
