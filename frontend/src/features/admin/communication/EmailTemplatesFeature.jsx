import React, { useState, useEffect, useRef } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Mail, Plus, CheckCircle, XCircle } from 'lucide-react';
import SDataTable from '@/components/common/SDataTable';
import SButton from '@/components/common/SButton';
import SModal from '@/components/common/SModal';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
import { getEmailTemplates, updateEmailTemplate, deleteEmailTemplate } from './communicationService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/AuthContext';
import toast from 'react-hot-toast';

const EmailTemplatesFeature = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const navigate = useRouter();
  const pathname = usePathname();
  const location = { pathname, search: typeof window !== "undefined" ? window.location.search : "" };
  const params = useParams();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ACTIVE');
  
  const [archiveTemplateUuid, setArchiveTemplateUuid] = useState(null);
  const [restoreTemplateUuid, setRestoreTemplateUuid] = useState(null);
  const [deleteTemplateUuid, setDeleteTemplateUuid] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isFetching = React.useRef(false);

  const fetchTemplates = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      setLoading(true);
      const data = await getEmailTemplates();
      setTemplates(data || []);
    } catch (err) {
      toast.error(t('admin.communication.fetch_error'));
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateNew = () => navigate.push('/admin/email-templates/create');
  const handleEdit = (uuid) => navigate.push(`/admin/email-templates/${uuid}/edit`);
  const handleView = (uuid) => navigate.push(`/admin/email-templates/${uuid}/view`);

  const confirmArchive = async () => {
    if (!archiveTemplateUuid) return;
    setIsProcessing(true);
    try {
      await updateEmailTemplate(archiveTemplateUuid, { status: 'INACTIVE' });
      toast.success(t('common.toaster.templateArchived'));
      setArchiveTemplateUuid(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to archive template');
      setArchiveTemplateUuid(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoreTemplateUuid) return;
    setIsProcessing(true);
    try {
      await updateEmailTemplate(restoreTemplateUuid, { status: 'ACTIVE' });
      toast.success(t('common.toaster.templateRestored'));
      setRestoreTemplateUuid(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to restore template');
      setRestoreTemplateUuid(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTemplateUuid) return;
    setIsProcessing(true);
    try {
      await deleteEmailTemplate(deleteTemplateUuid);
      toast.success(t('common.toaster.templateDeleted'));
      setDeleteTemplateUuid(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete template');
      setDeleteTemplateUuid(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    {
      key: 'template_key',
      label: t('admin.communication.template_key'),
      render: (item) => <strong style={{ color: 'var(--accent)' }}>{item.template_key}</strong>
    },
    {
      key: 'name',
      label: t('admin.communication.template_name'),
      sortable: true
    },
    {
      key: 'subject',
      label: t('admin.communication.subject')
    },
    {
      key: 'status',
      label: t('admin.communication.status'),
      render: (item) => (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          backgroundColor: item.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: item.status === 'ACTIVE' ? '#22c55e' : '#ef4444'
        }}>
          {item.status === 'ACTIVE' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {item.status}
        </span>
      )
    },
  ];

  const filteredTemplates = templates.filter(t => t.status === activeTab);

  return (
    <>
    <SDataTable
      title={
          <div style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={22} />
          {t('admin.communication.email_templates')}
          </div>
      }
      headerActions={
        userPermissions?.includes('admin.email_templates.create') ? (
          <SButton 
            type="button" 
            onClick={handleCreateNew} 
            icon="add" 
            text={t('admin.communication.create_template')}
            color="primary"
          />
        ) : null
      }
        topTabs={
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('ACTIVE')}
              style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'ACTIVE' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'ACTIVE' ? 'var(--accent)' : 'var(--text-h)', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('admin.communication.active_tab')}
            </button>
            <button
              onClick={() => setActiveTab('INACTIVE')}
              style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'INACTIVE' ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === 'INACTIVE' ? 'var(--accent)' : 'var(--text-h)', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('admin.communication.archived_tab')}
            </button>
          </div>
        }
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        actions={activeTab === 'ACTIVE' ? ['view', 'edit', 'archive', 'delete'] : ['view', 'restore', 'delete']}
        canExecuteAction={(action) => {
          if (action === 'view') return userPermissions.includes('admin.email_templates.view');
          if (action === 'edit') return userPermissions.includes('admin.email_templates.update');
          if (action === 'archive') return userPermissions.includes('admin.email_templates.archive') || userPermissions.includes('admin.email_templates.update');
          if (action === 'restore') return userPermissions.includes('admin.email_templates.restore') || userPermissions.includes('admin.email_templates.update');
          if (action === 'delete') return userPermissions.includes('admin.email_templates.delete') || userPermissions.includes('admin.email_templates.update');
          return false;
        }}
        onAction={(action, row) => {
          if (action === 'view') handleView(row.uuid);
          if (action === 'edit') handleEdit(row.uuid);
          if (action === 'archive') setArchiveTemplateUuid(row.uuid);
          if (action === 'restore') setRestoreTemplateUuid(row.uuid);
          if (action === 'delete') setDeleteTemplateUuid(row.uuid);
        }}
      emptyText={t('admin.communication.no_templates')}
    />
      <SModal
        isOpen={!!archiveTemplateUuid}
        title={t('common.confirmationModal.archiveEmailTemplateTitle')}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTemplateUuid(null)}
        confirmText={t('common.archive')}
        confirmColor="warning"
        isProcessing={isProcessing}
        text={t('common.confirmationModal.archiveEmailTemplateConfirm')}
      />
      <SModal
        isOpen={!!restoreTemplateUuid}
        title={t('common.confirmationModal.restoreEmailTemplateTitle')}
        onConfirm={confirmRestore}
        onCancel={() => setRestoreTemplateUuid(null)}
        confirmText={t('common.restore')}
        confirmColor="primary"
        isProcessing={isProcessing}
        text={t('common.confirmationModal.restoreEmailTemplateConfirm')}
      />
      <SDeleteConfirmation
        isOpen={!!deleteTemplateUuid}
        title={t('common.confirmationModal.deleteEmailTemplateTitle')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTemplateUuid(null)}
        isProcessing={isProcessing}
        text={t('common.confirmationModal.deleteEmailTemplateConfirm')}
      />
    </>
  );
};

export default EmailTemplatesFeature;
