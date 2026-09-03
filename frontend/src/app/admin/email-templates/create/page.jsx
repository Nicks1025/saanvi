"use client";
import React from 'react';
import EmailTemplateEditor from '@/features/admin/communication/EmailTemplateEditor';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  return (
    <ProtectedRoute requiredPermission="admin.email_templates.create">
      <AppLayout>
        <EmailTemplateEditor isViewing={false} onClose={() => router.push('/admin/email-templates')} />
      </AppLayout>
    </ProtectedRoute>
  );
}
