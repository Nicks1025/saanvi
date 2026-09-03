"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import SqlEditorFeature from '@/features/admin/sql-editor/SqlEditorFeature';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="admin.sql_editor">
      <AppLayout>
        <SqlEditorFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
