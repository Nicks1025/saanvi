'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import InternalWizardRunnerFeature from '@/features/form_wizards/internal/InternalWizardRunnerFeature';

export default function InternalWizardAddRecordPage() {
  return (
    <ProtectedRoute requiredPermission="objects.records.create">
      <AppLayout title="Add Record" showBackButton backUrl="/form-wizards">
        <InternalWizardRunnerFeature mode="add" />
      </AppLayout>
    </ProtectedRoute>
  );
}
