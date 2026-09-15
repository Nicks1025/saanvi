'use client';

import React from 'react';
import TemplateBuilderFeature from '@/features/objects/TemplateBuilderFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function TemplateBuilderPage() {
  return (
    <ProtectedRoute requiredPermission="objects.templates.view">
      <AppLayout>
        <TemplateBuilderFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
