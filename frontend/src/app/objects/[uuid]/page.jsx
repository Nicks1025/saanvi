'use client';
import React from 'react';
import ObjectDetailFeature from '@/features/objects/ObjectDetailFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function ObjectDetailPage() {
  return (
    <ProtectedRoute requiredPermission="objects.view">
      <AppLayout title="Object Details" showBackButton backUrl="/objects">
        <ObjectDetailFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
