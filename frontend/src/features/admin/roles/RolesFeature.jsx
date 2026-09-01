import React, { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../store/AuthContext';
import SDataTable from '../../../components/common/SDataTable';
import SButton from '../../../components/common/SButton';
import SModal from '../../../components/common/SModal';
import * as rolesService from './rolesService';
import '../users/users.css';

const RolesFeature = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen: false, role: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
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

  const handleEdit = (role) => {
    navigate(`/admin/roles/${role.uuid}`);
  };
  
  const handleCreate = () => {
    navigate(`/admin/roles/new`);
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
      toast.success(t('admin.roleDeleted', 'Role deleted successfully'));
    } catch (err) {
      console.error('Failed to delete role', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to delete role');
    } finally {
      setIsProcessing(false);
      setModalState({ isOpen: false, role: null });
    }
  };

  const columns = [
    { key: 'name', label: t('admin.roleName', 'Role Name'), sortable: true },
    { key: 'description', label: t('admin.description', 'Description'), sortable: true },
    { 
      key: 'is_active', 
      label: t('admin.status', 'Status'), 
      sortable: true,
      render: (item) => item.is_active ? 'Active' : 'Inactive'
    },
  ];

  return (
    <div className="admin-users-container">
      <SDataTable 
        title={t('admin.roles', 'Roles')}
        data={roles} 
        columns={columns} 
        serverSideSearch={true}
        onSearch={(query) => fetchRoles(query)}
        searchPlaceholder={t('admin.searchRoles', 'Search roles...')}
        loading={loading}
        actions={['edit', 'delete']}
        onAction={(action, row) => {
          if (action === 'edit') handleEdit(row);
          if (action === 'delete') handleDelete(row);
        }}
        canExecuteAction={(action) => {
          if (action === 'edit') return userPermissions.includes('admin.roles.edit');
          if (action === 'delete') return userPermissions.includes('admin.roles.delete');
          return false;
        }}
        headerActions={
          userPermissions.includes('admin.roles.create') ? (
            <SButton 
              onClick={handleCreate} 
              icon={<Plus size={16} />}
              style={{ flexShrink: 0 }}
            >
              <span className="sdt-action-text">{t('admin.addRole', 'Add Role')}</span>
            </SButton>
          ) : null
        }
      />
      
      <SModal
        isOpen={modalState.isOpen}
        title={t('admin.deleteRole', 'Delete Role')}
        onConfirm={confirmDelete}
        onCancel={() => setModalState({ isOpen: false, role: null })}
        isProcessing={isProcessing}
        confirmText={t('common.delete', 'Delete')}
        confirmColor="danger"
        text={modalState.role && t('admin.deleteRoleConfirm', 'Are you sure you want to PERMANENTLY delete role "{{roleName}}"? This cannot be undone.', { roleName: modalState.role.name })}
      />
    </div>
  );
};

export default RolesFeature;
