import React, { useState, useEffect } from 'react';
import { Pencil, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SDataTable from '../../../components/common/SDataTable';
import * as usersService from './usersService';
import './users.css';

const UsersFeature = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isFetched = React.useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchUsers();
  }, []);

  const fetchUsers = async (searchQuery = '') => {
    setLoading(true);
    try {
      const data = await usersService.getUsers(searchQuery);
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (user) => {
    navigate(`/admin/users/${user.uuid}?mode=view`, { state: { user } });
  };

  const handleEdit = (user) => {
    navigate(`/admin/users/${user.uuid}?mode=edit`, { state: { user } });
  };

  const columns = [
    { key: 'first_name', label: t('admin.firstName'), sortable: true },
    { key: 'last_name', label: t('admin.lastName'), sortable: true },
    { key: 'email', label: t('admin.email'), sortable: true },
    { key: 'status', label: t('admin.status'), sortable: true },
    { 
      key: 'actions', 
      label: t('admin.actions'),
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className="manage-btn" 
            onClick={() => handleView(item)}
            title={t('admin.viewUser', 'View User')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Eye size={18} />
          </button>
          <button 
            className="manage-btn" 
            onClick={() => handleEdit(item)}
            title={t('admin.editUser', 'Edit User')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Pencil size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-users-container">
      <SDataTable 
        title={t('admin.users')}
        data={users} 
        columns={columns} 
        serverSideSearch={true}
        onSearch={(query) => fetchUsers(query)}
        searchPlaceholder={t('admin.searchUsers')}
        loading={loading}
      />
    </div>
  );
};

export default UsersFeature;
