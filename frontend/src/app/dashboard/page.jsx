"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardFeature from '@/features/dashboard/DashboardFeature';

export default function Page() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <DashboardFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};
