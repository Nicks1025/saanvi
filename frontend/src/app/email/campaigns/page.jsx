"use client";
import React from 'react';
import EmailCampaignsFeature from '@/features/email/campaigns/EmailCampaignsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.email.campaign.get">
      <AppLayout>
        <EmailCampaignsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
