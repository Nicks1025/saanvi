"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import SettingsFeature from '@/features/settings/SettingsFeature';

export default function Page() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <SettingsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};
