'use client';
import React from 'react';
import FormWizardDetailFeature from '@/features/form_wizards/FormWizardDetailFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function FormWizardDetailPage() {
  return (
    <ProtectedRoute requiredPermission="form_wizards.view">
      <AppLayout title="Wizard Details" showBackButton backUrl="/form-wizards">
        <FormWizardDetailFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
