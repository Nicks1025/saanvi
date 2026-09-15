'use client';
import React from 'react';
import ObjectsFeature from '@/features/objects/ObjectsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function ObjectsPage() {
  return (
    <ProtectedRoute requiredPermission="objects.view">
      <AppLayout>
        <ObjectsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
