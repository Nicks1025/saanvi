import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import * as usersService from './usersService';
import * as rolesService from '../roles/rolesService';
import SButton from '@/components/common/SButton';

import { useAuth } from '@/store/AuthContext';

const UserDetailsFeature = () => {
  const { uuid } = useParams();
  const navigate = useRouter();
  const pathname = usePathname();
  const location = { pathname, search: typeof window !== "undefined" ? window.location.search : "" };
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const userPermissions = authUser?.permissions || [];
  
  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode');
  
  const [user, setUser] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'Active' });
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(
    initialMode === 'edit' && userPermissions.includes('admin.users.edit')
  );

  useEffect(() => {
    const mode = new URLSearchParams(location.search).get('mode');
    setIsEditMode(mode === 'edit' && userPermissions.includes('admin.users.edit'));
  }, [location.search, userPermissions]);

  const updateModeInUrl = (mode) => {
    const params = new URLSearchParams(location.search);
    params.set('mode', mode);
    navigate.replace("?" + params.toString());
  };

  const isFetched = React.useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchData();
  }, [uuid]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userDataResponse = await usersService.getUser(uuid);
      const userData = userDataResponse?.data || userDataResponse;
      setUser(userData);
      setEditForm({
        status: userData.status || 'Active'
      });
      
      const rolesData = await rolesService.getRoles();
      setAllRoles(rolesData || []);
      
      const userRolesData = await usersService.getUserRoles(uuid);
      setSelectedRoles(userRolesData || []);
    } catch (err) {
      toast.error(t('admin.failedLoadUser', 'Failed to load user details'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save basic details
      await usersService.updateUser(uuid, {
        status: editForm.status
      });

      // Save roles
      await usersService.updateUserRoles(uuid, selectedRoles);
      
      toast.success(t('admin.userUpdated', 'User updated successfully'));
      
      // Update local view state
      setUser(prev => ({
        ...prev,
        status: editForm.status
      }));
      
      navigate.push('/admin/users');
    } catch (err) {
      toast.error(err?.response?.data?.error || t('admin.updateUserFailed', 'Failed to update user'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    navigate.push('/admin/users');
  };

  if (loading) return <div style={{ padding: '2rem' }}>{t('common.loading', 'Loading...')}</div>;
  if (!user) return <div style={{ padding: '2rem' }}>{t('admin.userNotFound', 'User not found')}</div>;

  return (
    <div className="admin-users-container page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <button 
            onClick={() => navigate.push('/admin/users')}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, marginBottom: '0.5rem' }}
          >
            &larr; {t('admin.backToUsers', 'Back to Users')}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)' }}>
            {t('admin.userDetails', 'User Details')}
          </h1>
        </div>

      </div>

      <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{t('admin.profileInformation', 'Profile Information')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('admin.firstName', 'First Name')}</label>
            <input 
              type="text" 
              readOnly 
              disabled 
              value={user.first_name || '-'}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'var(--code-bg)', color: 'var(--text)', cursor: 'not-allowed' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('admin.lastName', 'Last Name')}</label>
            <input 
              type="text" 
              readOnly 
              disabled 
              value={user.last_name || '-'}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'var(--code-bg)', color: 'var(--text)', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('admin.email', 'Email')}</label>
            <input 
              type="text" 
              readOnly 
              disabled 
              value={user.email || '-'}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'var(--code-bg)', color: 'var(--text)', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('admin.status', 'Account Status')}</label>
            {isEditMode ? (
              <select 
                value={editForm.status}
                onChange={(e) => setEditForm(prev => ({...prev, status: e.target.value}))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'transparent', color: 'var(--text)' }}
              >
                <option value="Active">{t('admin.statusActive', 'Active')}</option>
                <option value="Inactive">{t('admin.statusInactive', 'Inactive')}</option>
              </select>
            ) : (
              <input 
                type="text" 
                readOnly 
                disabled 
                value={user.status || 'Active'}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'var(--code-bg)', color: 'var(--text)', cursor: 'not-allowed' }}
              />
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{t('admin.roles', 'Role')}</label>
            {isEditMode ? (
              <select 
                value={selectedRoles.length > 0 ? selectedRoles[0] : ''}
                onChange={(e) => setSelectedRoles(e.target.value ? [e.target.value] : [])}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'transparent', color: 'var(--text)' }}
              >
                <option value="">{t('admin.selectRolePlaceholder', 'Select a role...')}</option>
                {allRoles.map(role => (
                  <option key={role.uuid} value={role.uuid}>{role.name}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                readOnly 
                disabled 
                value={selectedRoles.length > 0 ? allRoles.filter(r => selectedRoles.includes(r.uuid)).map(r => r.name).join(', ') : '-'}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: 'var(--code-bg)', color: 'var(--text)', cursor: 'not-allowed' }}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
        {isEditMode ? (
          <>
            <SButton 
              onClick={cancelEdit}
              color="danger"
              icon="close"
              text={t('common.cancel', 'Cancel')}
            />
            <SButton 
              onClick={handleSave}
              disabled={saving}
              icon="save"
              text={saving ? t('common.saving', 'Saving...') : t('admin.saveChanges', 'Save Changes')}
              color="primary"
            />
          </>
        ) : (
          <SButton 
              onClick={() => navigate.push('/admin/users')}
              color="danger"
              icon="close"
              text={t('common.close', 'Close')}
          />
        )}
      </div>
    </div>
  );
};

export default UserDetailsFeature;
