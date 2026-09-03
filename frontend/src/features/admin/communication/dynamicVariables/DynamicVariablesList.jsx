import React, { useState, useEffect } from 'react';
import SDataTable from '@/components/common/SDataTable';
import SButton from '@/components/common/SButton';
import DynamicVariableModal from './DynamicVariableModal';
import SModal from '@/components/common/SModal';
import axios from '@/services/axios.client';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';

const DynamicVariablesList = () => {
  const { t } = useTranslation();
  const { userPermissions } = useAuth();
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVar, setSelectedVar] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, uuid: null });

  const fetchVariables = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/dynamic-variables');
      setVariables(res);
      setError(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dynamic variables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariables();
  }, []);

  const handleAdd = () => {
    setSelectedVar(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEdit = (variable) => {
    setSelectedVar(variable);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleView = (variable) => {
    setSelectedVar(variable);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleDeleteClick = (uuid) => {
    setDeleteConfirm({ open: true, uuid });
  };

  const handleDeleteConfirm = async () => {
    const uuid = deleteConfirm.uuid;
    setDeleteConfirm({ open: false, uuid: null });
    try {
      await axios.delete(`/api/admin/dynamic-variables/${uuid}`);
      toast.success('Dynamic variable deleted');
      fetchVariables();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete dynamic variable');
    }
  };
  const columns = [
    { key: 'variable_name', label: 'Variable Name' },
    { key: 'label', label: 'Label' },
    { 
      key: 'value', 
      label: 'Value',
      render: (row) => row.value || <span style={{ color: '#888' }}>None</span>
    },
    {
      key: 'created_by',
      label: 'Created By',
      render: (row) => row.creator_first_name 
        ? `${row.creator_first_name} ${row.creator_last_name || ''}`.trim() 
        : <span style={{ color: '#888' }}>System</span>
    },
    {
      key: 'updated_by',
      label: 'Updated By',
      render: (row) => row.updater_first_name 
        ? `${row.updater_first_name} ${row.updater_last_name || ''}`.trim() 
        : <span style={{ color: '#888' }}>System</span>
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : ''
    },
    {
      key: 'updated_at',
      label: 'Updated At',
      render: (row) => row.updated_at ? new Date(row.updated_at).toLocaleString() : ''
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      <SDataTable 
        title="Dynamic Variables"
        headerActions={
          userPermissions?.includes('admin.dynamic_variables.create') ? (
            <SButton color="primary" onClick={handleAdd} icon="add" text="Add Dynamic Variable" />
          ) : null
        }
        data={variables}
        columns={columns}
        loading={loading}
        actions={[
          'view',
          ...(userPermissions?.includes('admin.dynamic_variables.update') ? ['edit'] : []),
          ...(userPermissions?.includes('admin.dynamic_variables.delete') ? ['delete'] : [])
        ]}
        onAction={(action, row) => {
          if (action === 'view') handleView(row);
          if (action === 'edit') handleEdit(row);
          if (action === 'delete') handleDeleteClick(row.uuid);
        }}
      />

      {modalOpen && (
        <DynamicVariableModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          variable={selectedVar}
          mode={modalMode}
          onSuccess={fetchVariables}
        />
      )}

      {deleteConfirm.open && (
        <SModal
          isOpen={deleteConfirm.open}
          onCancel={() => setDeleteConfirm({ open: false, uuid: null })}
          onConfirm={handleDeleteConfirm}
          confirmText={t('common.delete', 'Delete')}
          confirmColor="danger"
          title={t('admin.confirmDeletionTitle', 'Confirm Deletion')}
          width="400px"
          text={t('admin.deleteDynamicVariableConfirm', 'Are you sure you want to delete this dynamic variable? This action may fail if it is currently in use.')}
        />
      )}
    </div>
  );
};

export default DynamicVariablesList;
