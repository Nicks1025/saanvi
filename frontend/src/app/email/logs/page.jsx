"use client";
import React from 'react';
import EmailLogsFeature from '@/features/email/logs/EmailLogsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.email.logs">
      <AppLayout>
        <EmailLogsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
