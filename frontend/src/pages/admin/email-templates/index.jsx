import React from 'react';
import EmailTemplatesFeature from '../../../features/admin/communication/EmailTemplatesFeature';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

const EmailTemplatesPage = () => {
  return (
    <ProtectedRoute requiredPermission="admin.email_templates.view">
      <AppLayout>
        <EmailTemplatesFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default EmailTemplatesPage;
