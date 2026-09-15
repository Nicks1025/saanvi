"use client";
import React from 'react';
import UserDetailsFeature from '@/features/admin/users/UserDetailsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.users.edit">
      <AppLayout>
        <UserDetailsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
