import React from 'react';
import EmailTemplateEditor from '../../../../features/admin/communication/EmailTemplateEditor';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import { useNavigate } from 'react-router-dom';

const CreateEmailTemplatePage = () => {
  const navigate = useNavigate();
  return (
    <ProtectedRoute requiredPermission="admin.email_templates.create">
      <AppLayout>
        <EmailTemplateEditor isViewing={false} onClose={() => navigate('/admin/email-templates')} />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default CreateEmailTemplatePage;
