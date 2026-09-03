"use client";
import React from 'react';
import UsersFeature from '@/features/admin/users/UsersFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.users.view">
      <AppLayout>
        <UsersFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
