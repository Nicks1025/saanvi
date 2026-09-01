import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkflows, deleteWorkflow } from './communicationService';
import toast from 'react-hot-toast';
import { Workflow, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SDataTable from '../../../components/common/SDataTable';
import SButton from '../../../components/common/SButton';
import SModal from '../../../components/common/SModal';

const WorkflowsFeature = ({ disableContainer = false, topTabs }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const wfRes = await getWorkflows();
      setWorkflows(wfRes.data || wfRes || []);
    } catch (err) {
      toast.error('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id) => {
    setDeleteWorkflowId(id);
  };

  const confirmDelete = async () => {
    if (!deleteWorkflowId) return;
    setIsDeleting(true);
    try {
      await deleteWorkflow(deleteWorkflowId);
      toast.success('Workflow deleted');
      setDeleteWorkflowId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete workflow');
      setDeleteWorkflowId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'trigger_event_key',
      label: 'Trigger Event',
      sortable: true
    },
    {
      key: 'active',
      label: 'Status',
      render: (wf) => (
        <span style={{ 
          padding: '0.25rem 0.5rem', 
          borderRadius: '12px', 
          fontSize: '0.85rem',
          background: wf.active ? 'var(--success-bg, #e6f4ea)' : 'var(--error-bg, #fce8e6)',
          color: wf.active ? 'var(--success-text, #137333)' : 'var(--error-text, #c5221f)'
        }}>
          {wf.active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (loading) return <div>Loading Workflows...</div>;

  return (
    <div className={`admin-workflows-container ${disableContainer ? '' : 'page-container'}`}>
      {topTabs && (
        <div style={{ padding: '1rem 1rem 0 1rem', margin: '-1rem -1rem 1rem -1rem' }}>
          {topTabs}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
          <Workflow /> Workflows
        </h1>
        <SButton 
          onClick={() => navigate('/admin/workflow/create')}
          size="m"
          icon={<Plus size={16} />}
        >
          Create Workflow
        </SButton>
      </div>

      <SDataTable
        columns={columns}
        data={workflows}
        loading={loading}
        actions={['view', 'edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'view') navigate(`/admin/workflow/${row.id}/view`);
          if (action === 'edit') navigate(`/admin/workflow/${row.id}/edit`);
          if (action === 'delete') handleDelete(row.id);
        }}
        emptyText="No workflows configured."
      />

      <SModal
        isOpen={!!deleteWorkflowId}
        title={t('admin.deleteWorkflowTitle', 'Delete Workflow')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteWorkflowId(null)}
        confirmText={t('common.delete', 'Delete')}
        confirmColor="danger"
        text={t('admin.deleteWorkflowConfirm', 'Are you sure you want to delete this workflow? This action cannot be undone.')}
      />
    </div>
  );
};

export default WorkflowsFeature;
