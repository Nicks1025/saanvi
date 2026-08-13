import React, { useState, useEffect } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SDataTable from '../../../components/common/SDataTable';
import * as rolesService from './rolesService';
import '../users/users.css';

const RolesFeature = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const columns = [
    { key: 'name', label: t('admin.roleName', 'Role Name'), sortable: true },
    { key: 'description', label: t('admin.description', 'Description'), sortable: true },
    { 
      key: 'is_active', 
      label: t('admin.status', 'Status'), 
      sortable: true,
      render: (item) => item.is_active ? 'Active' : 'Inactive'
    },
    { 
      key: 'actions', 
      label: t('admin.actions', 'Actions'),
      render: (item) => (
        <button 
          className="manage-btn" 
          onClick={() => handleEdit(item)}
          title={t('admin.editRole', 'Edit Role')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Pencil size={18} />
        </button>
      )
    }
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
        headerActions={
          <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <Plus size={16} /> {t('admin.addRole', 'Add Role')}
          </button>
        }
      />
    </div>
  );
};

export default RolesFeature;
