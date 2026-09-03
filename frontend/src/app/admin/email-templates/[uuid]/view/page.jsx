"use client";
import React from 'react';
import EmailTemplateEditor from '@/features/admin/communication/EmailTemplateEditor';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useRouter, useParams } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const { uuid } = useParams();

  return (
    <ProtectedRoute requiredPermission="admin.email_templates.view">
      <AppLayout>
        <EmailTemplateEditor templateUuid={uuid} isViewing={true} onClose={() => router.push('/admin/email-templates')} />
      </AppLayout>
    </ProtectedRoute>
  );
}
