"use client";
import React from 'react';
import CampaignFormFeature from '@/features/email/campaigns/CampaignFormFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.email.campaign.create">
      <AppLayout>
        <CampaignFormFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
