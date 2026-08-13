import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save } from 'lucide-react';
import PermissionTree from '../../../components/common/PermissionTree';
import SButton from '../../../components/common/SButton';
import * as usersService from './usersService';
import './users.css';

const UserPermissionsFeature = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = location.state?.user || null;

  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isFetched = React.useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchData();
  }, [uuid]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allPerms, userPerms] = await Promise.all([
        usersService.getPermissions(),
        usersService.getUserPermissions(uuid)
      ]);
      setAllPermissions(allPerms || []);
      setSelectedPermissionIds(userPerms || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      await usersService.updateUserPermissions(uuid, selectedPermissionIds);
      navigate('/admin/users');
    } catch (err) {
      console.error('Failed to save permissions', err);
      alert('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>{t('admin.loadingPermissions')}</div>;
  }

  return (
    <div className="admin-users-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <button 
            onClick={() => navigate('/admin/users')}
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} />
            {t('admin.backToUsers')}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>
            {t('admin.managePermissions', { email: user ? `- ${user.email}` : '' })}
          </h1>
        </div>
        <div>
          <SButton 
            variant="primary" 
            onClick={handleSavePermissions}
            loading={isSaving}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} />
            {t('admin.saveChanges')}
          </SButton>
        </div>
      </div>
      
      <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
        <PermissionTree 
          permissions={allPermissions}
          selectedPermissions={selectedPermissionIds}
          onChange={setSelectedPermissionIds}
        />
      </div>
    </div>
  );
};

export default UserPermissionsFeature;
