import React, { useState, useEffect } from 'react';
import { Pencil, Eye, Archive, Trash2, RefreshCw, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../store/AuthContext';
import SDataTable from '../../../components/common/SDataTable';
import SModal from '../../../components/common/SModal';
import SButton from '../../../components/common/SButton';
import * as usersService from './usersService';
import './users.css';

const UsersFeature = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, type: null, user: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  const isFetched = React.useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchUsers('', showArchived, 1, 10);
  }, []);

  const fetchUsers = async (query = searchQuery, archived = showArchived, p = page, l = limit) => {
    setLoading(true);
    try {
      const response = await usersService.getUsers(query, archived, p, l);
      const usersData = Array.isArray(response) ? response : (response?.data || []);
      setUsers(usersData);
      setTotal(response?.total || 0);
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

  const handleArchive = (user) => {
    setModalState({ isOpen: true, type: 'archive', user });
  };

  const handleRestore = (user) => {
    setModalState({ isOpen: true, type: 'restore', user });
  };

  const handleDelete = (user) => {
    setModalState({ isOpen: true, type: 'delete', user });
  };

  const confirmAction = async () => {
    const { type, user } = modalState;
    if (!user) return;
    
    setIsProcessing(true);
    try {
      if (type === 'archive') {
        await usersService.archiveUser(user.uuid);
      } else if (type === 'restore') {
        await usersService.restoreUser(user.uuid);
      } else if (type === 'delete') {
        await usersService.deleteUser(user.uuid);
      }
      setModalState({ isOpen: false, type: null, user: null });
      toast.success(t(`admin.${type}UserSuccess`, `User ${type}d successfully`));
      fetchUsers(searchQuery, showArchived, page, limit);
    } catch (err) {
      console.error(`Failed to ${type} user`, err);
      toast.error(err.response?.data?.error || err.response?.data?.message || `Failed to ${type} user.`);
    } finally {
      setIsProcessing(false);
    }
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
          {userPermissions.includes('admin.users.view') && (
            <button
              className="manage-btn"
              onClick={() => handleView(item)}
              title={t('admin.viewUser', 'View User')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Eye size={18} />
            </button>
          )}
          {userPermissions.includes('admin.users.edit') && (
            <button
              className="manage-btn"
              onClick={() => handleEdit(item)}
              title={t('admin.editUser', 'Edit User')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Pencil size={18} />
            </button>
          )}
          {!showArchived && userPermissions.includes('admin.users.archive') && (
            <button 
              className="manage-btn" 
              onClick={() => handleArchive(item)}
              title={t('admin.archiveUser', 'Archive User')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b' }}
            >
              <Archive size={18} />
            </button>
          )}
          {showArchived && userPermissions.includes('admin.users.restore') && (
            <button 
              className="manage-btn" 
              onClick={() => handleRestore(item)}
              title={t('admin.restoreUser', 'Restore User')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
            >
              <RefreshCw size={18} />
            </button>
          )}
          {userPermissions.includes('admin.users.delete') && (
            <button
              className="manage-btn"
              onClick={() => handleDelete(item)}
              title={t('admin.deleteUser', 'Delete User')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )
    }
  ];

  const handleTabChange = (archived) => {
    setShowArchived(archived);
    setPage(1);
    fetchUsers(searchQuery, archived, 1, limit);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
    fetchUsers(query, showArchived, 1, limit);
  };

  const tabs = (
    <div className="admin-users-tabs" style={{ margin: 0, borderBottom: 'none' }}>
      <button 
        className={`admin-tab ${!showArchived ? 'active' : ''}`}
        onClick={() => handleTabChange(false)}
      >
        {t('admin.active', 'Active')}
      </button>
      <button 
        className={`admin-tab ${showArchived ? 'active' : ''}`}
        onClick={() => handleTabChange(true)}
      >
        {t('admin.archived', 'Archived')}
      </button>
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <SDataTable 
        title={t('admin.users')}
        data={users} 
        columns={columns} 
        serverSideSearch={true}
        onSearch={handleSearch}
        searchPlaceholder={t('admin.searchUsers')}
        loading={loading}
        topTabs={tabs}
        headerActions={
          userPermissions?.includes('admin.users.create') ? (
            <SButton
              text={t('admin.addUser', 'Add User')}
              icon={<UserPlus size={16} />}
              onClick={() => navigate('/admin/users/add')}
              style={{ background: 'var(--accent)', color: 'white', whiteSpace: 'nowrap' }}
            />
          ) : null
        }
        pagination={{
          page,
          limit,
          total,
          onPageChange: (newPage) => {
            setPage(newPage);
            fetchUsers(searchQuery, showArchived, newPage, limit);
          },
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1);
            fetchUsers(searchQuery, showArchived, 1, newLimit);
          }
        }}
      />
      
      <SModal
        isOpen={modalState.isOpen}
        title={
          modalState.type === 'archive' ? t('admin.archiveUser', 'Archive User') :
          modalState.type === 'restore' ? t('admin.restoreUser', 'Restore User') :
          t('admin.deleteUser', 'Delete User')
        }
        onConfirm={confirmAction}
        onCancel={() => setModalState({ isOpen: false, type: null, user: null })}
        isProcessing={isProcessing}
        confirmText={
          modalState.type === 'archive' ? t('common.archive', 'Archive') :
          modalState.type === 'restore' ? t('common.restore', 'Restore') :
          t('common.delete', 'Delete')
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {modalState.type === 'delete' && modalState.user ? (
            t('admin.deleteUserConfirm', 'Are you sure you want to PERMANENTLY delete user {{email}}? This cannot be undone.', { email: modalState.user.email })
          ) : modalState.type === 'archive' && modalState.user ? (
            t('admin.archiveUserConfirm', 'Are you sure you want to archive user {{email}}?', { email: modalState.user.email })
          ) : modalState.type === 'restore' && modalState.user ? (
            t('admin.restoreUserConfirm', 'Are you sure you want to restore user {{email}}?', { email: modalState.user.email })
          ) : ''}
        </p>
      </SModal>
    </div>
  );
};

export default UsersFeature;
