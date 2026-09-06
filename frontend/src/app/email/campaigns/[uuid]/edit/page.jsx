"use client";
import React, { use } from 'react';
import CampaignFormFeature from '@/features/email/campaigns/CampaignFormFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function Page({ params }) {
  // Use React.use() to unwrap the params promise in Next.js 15
  const unwrappedParams = use(params);
  
  return (
    <ProtectedRoute requiredPermission="admin.email.campaign.update">
      <AppLayout>
        <CampaignFormFeature editUuid={unwrappedParams.uuid} />
      </AppLayout>
    </ProtectedRoute>
  );
}
