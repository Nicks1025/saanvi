"use client";
import React from 'react';
import CreateCampaignFeature from '@/features/email/campaigns/CreateCampaignFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.email.campaign.create">
      <AppLayout>
        <CreateCampaignFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
