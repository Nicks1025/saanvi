import React from 'react';
import EmailTemplateEditor from '../../../../features/admin/communication/EmailTemplateEditor';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import { useNavigate, useParams } from 'react-router-dom';

const EditEmailTemplatePage = () => {
  const navigate = useNavigate();
  const { uuid } = useParams();
  return (
    <ProtectedRoute requiredPermission="admin.email_templates.update">
      <AppLayout>
        <EmailTemplateEditor templateUuid={uuid} isViewing={false} onClose={() => navigate('/admin/email-templates')} />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default EditEmailTemplatePage;
