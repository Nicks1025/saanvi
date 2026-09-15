'use client';
import React from 'react';
import FormWizardsFeature from '@/features/form_wizards/FormWizardsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function FormWizardsPage() {
  return (
    <ProtectedRoute requiredPermission="form_wizards.view">
      <AppLayout>
        <FormWizardsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
