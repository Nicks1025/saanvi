'use client';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import ObjectRecordFormFeature from '@/features/objects/ObjectRecordFormFeature';

export default function EditObjectRecordPage() {
  return (
    <ProtectedRoute requiredPermission="objects.records.update">
      <AppLayout title="Edit Object Record" showBackButton backUrl={`/objects`}>
        <ObjectRecordFormFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
