'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import ObjectRecordFormFeature from '@/features/objects/ObjectRecordFormFeature';

export default function AddObjectRecordPage() {
  return (
    <ProtectedRoute requiredPermission="objects.records.create">
      <AppLayout title="Add Object Record" showBackButton backUrl={`/objects`}>
        <ObjectRecordFormFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
