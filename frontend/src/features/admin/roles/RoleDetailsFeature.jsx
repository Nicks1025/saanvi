import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Save, X } from 'lucide-react';
import * as rolesService from './rolesService';
import PermissionTree from '../../../components/common/PermissionTree';
import SButton from '../../../components/common/SButton';
import { useAuth } from '../../../store/AuthContext';

const RoleDetailsFeature = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  
  const isNew = uuid === 'new';
  const [role, setRole] = useState({ name: '', description: '', is_active: true });
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const canEdit = isNew 
    ? userPermissions.includes('admin.roles.create')
    : userPermissions.includes('admin.roles.edit');

  const isFetched = React.useRef(false);

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchData();
  }, [uuid]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const perms = await rolesService.getAllPermissions();
      setAllPermissions(perms || []);
      
      if (!isNew) {
        const roleData = await rolesService.getRoleByUuid(uuid);
        setRole(roleData);
        
        const rolePerms = await rolesService.getRolePermissions(uuid);
        setSelectedPermissions(rolePerms || []);
      }
    } catch (err) {
      toast.error(t('admin.roleLoadFailed', 'Failed to load role details'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!role.name.trim()) {
      toast.error(t('admin.roleNameRequired', 'Role name is required'));
      return;
    }
    
    try {
      setSaving(true);
      let savedRole;
      if (isNew) {
        savedRole = await rolesService.createRole(role);
        if (selectedPermissions.length > 0) {
          await rolesService.updateRolePermissions(savedRole.uuid, selectedPermissions);
        }
        toast.success(t('admin.roleCreated', 'Role created successfully'));
        navigate(`/admin/roles`);
      } else {
        await rolesService.updateRole(uuid, role);
        await rolesService.updateRolePermissions(uuid, selectedPermissions);
        toast.success(t('admin.roleUpdated', 'Role updated successfully'));
        navigate(`/admin/roles`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || t('admin.roleSaveFailed', 'Failed to save role'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="admin-users-container page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <button 
            onClick={() => navigate('/admin/roles')}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, marginBottom: '0.5rem' }}
          >
            &larr; {t('admin.backToRoles', 'Back to Roles')}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)' }}>
            {isNew ? t('admin.createNewRole', 'Create New Role') : t('admin.roleDetails', 'Role Details')}
          </h1>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{t('admin.roleInformation', 'Role Information')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', opacity: canEdit ? 1 : 0.7 }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('admin.roleName', 'Role Name')}</label>
            <input 
              type="text" 
              value={role.name}
              readOnly={!canEdit}
              disabled={!canEdit}
              onChange={(e) => setRole({ ...role, name: e.target.value })}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: canEdit ? 'transparent' : 'var(--code-bg)', color: 'var(--text)', cursor: canEdit ? 'text' : 'not-allowed' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('admin.description', 'Description')}</label>
            <input 
              type="text" 
              value={role.description || ''}
              readOnly={!canEdit}
              disabled={!canEdit}
              onChange={(e) => setRole({ ...role, description: e.target.value })}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none', background: canEdit ? 'transparent' : 'var(--code-bg)', color: 'var(--text)', cursor: canEdit ? 'text' : 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
              <input 
                type="checkbox" 
                checked={role.is_active}
                disabled={!canEdit}
                onChange={(e) => setRole({ ...role, is_active: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: canEdit ? 'pointer' : 'not-allowed' }}
              />
              <span style={{ fontWeight: 'bold' }}>{t('admin.isActive', 'Active')}</span>
            </label>
          </div>
        </div>

        <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>{t('admin.permissions', 'Permissions')}</h3>
        <div style={{ pointerEvents: canEdit ? 'auto' : 'none', opacity: canEdit ? 1 : 0.7 }}>
          <PermissionTree 
            permissions={allPermissions}
            selectedPermissions={selectedPermissions}
            onChange={(newPerms) => { if (canEdit) setSelectedPermissions(newPerms); }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
        {canEdit ? (
          <>
            <SButton 
              onClick={() => navigate('/admin/roles')}
              icon={<X size={16} />}
              text={t('common.cancel', 'Cancel')}
              style={{ background: '#ffebee', color: '#d32f2f', border: 'none', fontWeight: 600 }}
            />
            <SButton 
              onClick={handleSave}
              disabled={saving}
              icon={<Save size={16} />}
              text={saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              style={{ background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 600 }}
            />
          </>
        ) : (
          <SButton 
            onClick={() => navigate('/admin/roles')}
            icon={<X size={16} />}
            text={t('common.close', 'Close')}
            style={{ background: '#ffebee', color: '#d32f2f', border: 'none', fontWeight: 600 }}
          />
        )}
      </div>
    </div>
  );
};

export default RoleDetailsFeature;
