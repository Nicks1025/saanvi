'use client';
import AuditLogsFeature from '../../../features/admin/audit-logs/AuditLogsFeature';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function AuditLogsPage() {
  return (
    <ProtectedRoute requiredPermission="admin.audit_logs.view">
      <AppLayout>
        <AuditLogsFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
