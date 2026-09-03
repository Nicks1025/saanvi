"use client";
import React from 'react';
import EmailTemplatesFeature from '@/features/admin/communication/EmailTemplatesFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.email_templates.view">
      <AppLayout>
        <EmailTemplatesFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
