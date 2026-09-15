'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import ObjectRecordFormFeature from '@/features/objects/ObjectRecordFormFeature';

export default function ViewObjectRecordPage() {
  return (
    <ProtectedRoute requiredPermission="objects.records.view">
      <AppLayout title="View Object Record" showBackButton backUrl={`/objects`}>
        <ObjectRecordFormFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
