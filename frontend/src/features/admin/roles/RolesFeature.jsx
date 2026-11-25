import React, { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/store/AuthContext';
import SDataTable from '@/components/common/SDataTable';
import SButton from '@/components/common/SButton';
import SDeleteConfirmation from '@/components/common/SDeleteConfirmation';
import * as rolesService from './rolesService';
import '../users/users.css';

const RolesFeature = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, role: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const isFetched = React.useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchRoles();
  }, []);

  const fetchRoles = async (searchQuery = '') => {
    setLoading(true);
    try {
      const data = await rolesService.getRoles(searchQuery);
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (role) => {
    navigate.push(`/admin/roles/${role.uuid}?mode=view`);
  };

  const handleEdit = (role) => {
    navigate.push(`/admin/roles/${role.uuid}?mode=edit`);
  };

  const handleCreate = () => {
    navigate.push(`/admin/roles/new`);
  };

  const handleDelete = (role) => {
    setModalState({ isOpen: true, role });
  };

  const confirmDelete = async () => {
    const role = modalState.role;
    if (!role) return;

    setIsProcessing(true);
    try {
      await rolesService.deleteRole(role.uuid);
      setRoles(roles.filter(r => r.uuid !== role.uuid));
      toast.success(t('common.toaster.roleDeleted'));
    } catch (err) {
      console.error('Failed to delete role', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to delete role');
    } finally {
      setIsProcessing(false);
      setModalState({ isOpen: false, role: null });
    }
  };

  const columns = [
    { key: 'name', label: t('admin.roles.roleName'), sortable: true },
    { key: 'description', label: t('admin.roles.description'), sortable: true },
    {
      key: 'is_active',
      label: t('admin.roles.status'),
      sortable: true,
      render: (item) => item.is_active ? 'Active' : 'Inactive'
    },
  ];

  return (
    <div className="admin-users-container">
      <SDataTable
        title={t('admin.roles.title')}
        data={roles}
        columns={columns}
        serverSideSearch={true}
        onSearch={(query) => fetchRoles(query)}
        searchPlaceholder={t('admin.roles.searchRoles')}
        loading={loading}
        actions={['view', 'edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'view') handleView(row);
          if (action === 'edit') handleEdit(row);
          if (action === 'delete') handleDelete(row);
        }}
        canExecuteAction={(action) => {
          if (action === 'view') return userPermissions.includes('admin.roles.view');
          if (action === 'edit') return userPermissions.includes('admin.roles.edit');
          if (action === 'delete') return userPermissions.includes('admin.roles.delete');
          return false;
        }}
        headerActions={
          userPermissions.includes('admin.roles.create') ? (
            <SButton
              onClick={handleCreate}
              icon="add"
              text={t('admin.roles.addRole')}
              className="flex-shrink-0"
            />
          ) : null
        }
      />

      <SDeleteConfirmation
        isOpen={modalState.isOpen}
        title={t('admin.roles.deleteRole')}
        onConfirm={confirmDelete}
        onCancel={() => setModalState({ isOpen: false, role: null })}
        isProcessing={isProcessing}
        text={modalState.role && t('common.confirmationModal.deleteRoleConfirm', { roleName: modalState.role.name })}
      />
    </div>
  );
};

export default RolesFeature;
