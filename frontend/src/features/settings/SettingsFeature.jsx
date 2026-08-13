import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';
import { validatePassword, validateConfirmPassword, validateRequired, validatePhone, validateDate, validateCurrentPassword } from '../../common/validations';
import SDropdown from '../../components/common/SDropdown';
import SButton from '../../components/common/SButton';
import STextField from '../../components/common/STextField';
import { settingsService } from './services/settingsService';
import { themeOptions, fontOptions } from '../../constants/themeConstants';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import MfaSetupFeature from './MfaSetupFeature';
import './settings.css';

const SettingsFeature = () => {
  const { user, setUser } = useAuth();
  const { theme, setTheme, font, setFont } = useTheme();
  const { t, i18n } = useTranslation();
  const changeImageRef = React.useRef(null);

  const [isSaving, setIsSaving] = React.useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = React.useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    displayName: user?.displayName || '',
    phoneNumber: user?.phoneNumber || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });
  
  const [profileImage, setProfileImage] = React.useState(user?.profileImageUrl || null);
  const [removeImage, setRemoveImage] = React.useState(false);

  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const handleProfileChange = (field, value) => {
    if (field === 'phoneNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePassword = async () => {
    const currentErr  = validateCurrentPassword(passwordForm.currentPassword);
    const newPassErr  = validatePassword(passwordForm.newPassword, {
      firstName:   user?.firstName   || profileForm.firstName,
      lastName:    user?.lastName    || profileForm.lastName,
      displayName: user?.displayName || profileForm.displayName,
    });
    const confirmErr  = validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword);

    if (currentErr || newPassErr || confirmErr) return;

    setIsSavingPassword(true);
    try {
      const res = await settingsService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.success) {
        toast.success(t('settings.passwordSuccess', 'Password updated successfully'));
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
      } else {
        toast.error(res.error || 'Failed to update password');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
      });
      setProfileImage(user.profileImageUrl || null);
    }
  }, [user]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Save UI Settings
      const settingsResponse = await settingsService.updateSettings({
        theme,
        font,
        language: i18n.resolvedLanguage || 'en'
      });

      // 2. Save Profile Info (Only if changed)
      const formData = new FormData();
      let hasProfileChanges = false;

      if (profileForm.firstName !== (user?.firstName || '')) {
        formData.append('firstName', profileForm.firstName);
        hasProfileChanges = true;
      }
      if (profileForm.lastName !== (user?.lastName || '')) {
        formData.append('lastName', profileForm.lastName);
        hasProfileChanges = true;
      }
      if (profileForm.displayName !== (user?.displayName || '')) {
        formData.append('displayName', profileForm.displayName);
        hasProfileChanges = true;
      }
      if (profileForm.phoneNumber !== (user?.phoneNumber || '')) {
        formData.append('phoneNumber', profileForm.phoneNumber);
        hasProfileChanges = true;
      }
      if (profileForm.dateOfBirth !== (user?.dateOfBirth || '')) {
        formData.append('dateOfBirth', profileForm.dateOfBirth);
        hasProfileChanges = true;
      }
      if (profileForm.gender !== (user?.gender || '')) {
        formData.append('gender', profileForm.gender);
        hasProfileChanges = true;
      }
      
      if (removeImage) {
        formData.append('removeImage', 'true');
        hasProfileChanges = true;
      } else if (profileImage instanceof File) {
        formData.append('profile_image', profileImage);
        hasProfileChanges = true;
      }

      let profileResponse = { success: true, data: {} };
      if (hasProfileChanges) {
        profileResponse = await settingsService.updateProfile(formData);
      }

      if (settingsResponse.success && profileResponse.success) {
        toast.success(t('settings.saveSuccess', 'Settings & Profile saved successfully'));
        const updatedUser = { 
          ...user, 
          ...(hasProfileChanges ? profileResponse.data : {}), 
          theme, 
          font, 
          language: i18n.resolvedLanguage || 'en' 
        };
        setUser(updatedUser);
        sessionStorage.setItem('auth_user', JSON.stringify(updatedUser));
        setRemoveImage(false);
      }
    } catch (error) {
      toast.error(error.message || t('settings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <div className="settings-info-row">
      <div className="settings-info-label">{label}</div>
      <div className="settings-info-value">{value || <span style={{ color: '#ccc', fontStyle: 'italic' }}>{t('settings.notProvided')}</span>}</div>
    </div>
  );

  const langOptions = [
    { label: 'English', value: 'en' },
    { label: 'हिंदी', value: 'hi' },
  ];

  const genderOptions = [
    { label: 'Select Gender', value: '' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' }
  ];

  return (
    <div className="settings-container">
      <h1 className="settings-header">
        {t('settings.title')}
      </h1>
      
      <div className="settings-layout">
        <div className="settings-profile-col">
          <input
            ref={changeImageRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) { setProfileImage(file); setRemoveImage(false); }
              e.target.value = '';
            }}
          />
          <div
            className={`settings-avatar-container${!profileImage ? ' settings-avatar-empty' : ''}`}
            onClick={!profileImage ? () => changeImageRef.current?.click() : undefined}
          >
            {profileImage ? (
              <img
                src={profileImage instanceof File ? URL.createObjectURL(profileImage) : profileImage}
                alt="Profile"
                className="settings-profile-avatar"
              />
            ) : (
              <div className="settings-avatar-placeholder">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <span>Upload Photo</span>
              </div>
            )}
            {profileImage && (
              <div className="settings-avatar-overlay">
                <button className="settings-avatar-action" onClick={() => changeImageRef.current?.click()} type="button">Change</button>
                <button className="settings-avatar-action settings-avatar-action--remove" onClick={() => { setProfileImage(null); setRemoveImage(true); }} type="button">Remove</button>
              </div>
            )}
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            <div style={{ fontSize: '1rem', color: 'var(--text)', wordBreak: 'break-word' }}>
              <span style={{ fontWeight: '600', marginRight: '0.5rem', color: 'var(--text-muted)' }}>Name:</span>
              {user?.firstName || ''} {user?.lastName || ''}
            </div>
            <div style={{ fontSize: '1rem', color: 'var(--text)', wordBreak: 'break-word' }}>
              <span style={{ fontWeight: '600', marginRight: '0.5rem', color: 'var(--text-muted)' }}>Email:</span>
              {user?.email || ''}
            </div>
            {user?.roles && user.roles.length > 0 && (
              <div style={{ fontSize: '1rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                <span style={{ fontWeight: '600', marginRight: '0.5rem', color: 'var(--text-muted)' }}>Role:</span>
                <span style={{ textTransform: 'capitalize' }}>{user.roles}</span>
              </div>
            )}
          </div>
        </div>

        <div className="settings-main-col">
          <div className="settings-section">
            <h2 className="settings-section-title">
              {t('settings.profileInfo')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <STextField 
                  label={t('settings.firstName', 'First Name')} 
                  text={profileForm.firstName} 
                  onChange={(e) => handleProfileChange('firstName', e.target.value)} 
                  required
                  validate={(v) => validateRequired(v, 'First name')}
                />
                <STextField 
                  label={t('settings.lastName', 'Last Name')} 
                  text={profileForm.lastName} 
                  onChange={(e) => handleProfileChange('lastName', e.target.value)} 
                  required
                  validate={(v) => validateRequired(v, 'Last name')}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <STextField 
                  label={t('settings.displayName', 'Display Name')} 
                  text={profileForm.displayName} 
                  onChange={(e) => handleProfileChange('displayName', e.target.value)} 
                  required
                  validate={(v) => validateRequired(v, 'Display name')}
                />
                <STextField 
                  label={t('settings.phoneNumber', 'Phone Number')} 
                  text={profileForm.phoneNumber} 
                  onChange={(e) => handleProfileChange('phoneNumber', e.target.value)} 
                  required
                  validate={validatePhone}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <STextField 
                  label={t('settings.dateOfBirth', 'Date of Birth')} 
                  type="date"
                  text={profileForm.dateOfBirth} 
                  onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)} 
                  required
                  validate={(v) => validateDate(v, 'Date of birth')}
                />
                <div>
                  <SDropdown 
                    label={
                      <span>
                        {t('settings.gender', 'Gender')}
                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                      </span>
                    } 
                    value={profileForm.gender}
                    onChange={(v) => handleProfileChange('gender', v)}
                    options={genderOptions}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h2 className="settings-section-title">
              {t('settings.themePrefs')}
            </h2>

            <div className="settings-info-row" style={{ borderBottom: 'none' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
                <SDropdown
                  label={t('settings.language')}
                  value={i18n.resolvedLanguage || 'en'}
                  onChange={(lng) => i18n.changeLanguage(lng)}
                  options={langOptions}
                />
                <SDropdown
                  label={t('settings.appTheme')}
                  value={theme}
                  onChange={setTheme}
                  options={themeOptions}
                />
                <SDropdown
                  label={t('settings.textStyle')}
                  value={font}
                  onChange={setFont}
                  options={fontOptions}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">
              {t('settings.securityStatus')}
            </h2>
            
            <InfoRow 
              label={t('settings.accountStatus')} 
              value={
                <>
                  <span className={`settings-status-dot ${user?.status === 'active' ? 'settings-status-active' : 'settings-status-inactive'}`}></span>
                  <span style={{ textTransform: 'capitalize' }}>{user?.status}</span>
                </>
              } 
            />
            
            <InfoRow 
              label={t('settings.emailVerified')} 
              value={
                user?.isEmailVerified ? (
                  <><CheckCircle size={18} color="#2ecc71" /> {t('settings.yes')}</>
                ) : (
                  <><XCircle size={18} color="#f39c12" /> {t('settings.no')}</>
                )
              } 
            />
            
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
              <MfaSetupFeature />
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
              {!isChangingPassword ? (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <SButton onClick={() => setIsChangingPassword(true)} color="secondary" type="button">
                    Change Password
                  </SButton>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', maxWidth: '400px' }}>
                  <STextField
                    type="password"
                    label="Current Password"
                    text={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                    validate={validateCurrentPassword}
                  />
                  <STextField
                    type="password"
                    label="New Password"
                    text={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    validate={(v) => validatePassword(v, {
                      firstName:   user?.firstName   || profileForm.firstName,
                      lastName:    user?.lastName    || profileForm.lastName,
                      displayName: user?.displayName || profileForm.displayName,
                    })}
                  />
                  <STextField
                    type="password"
                    label="Re-type New Password"
                    text={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    validate={(v) => validateConfirmPassword(passwordForm.newPassword, v)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1rem' }}>
                    <SButton
                      onClick={handleSavePassword}
                      disabled={
                        isSavingPassword ||
                        !!validateCurrentPassword(passwordForm.currentPassword) ||
                        !!validatePassword(passwordForm.newPassword, {
                          firstName:   user?.firstName   || profileForm.firstName,
                          lastName:    user?.lastName    || profileForm.lastName,
                          displayName: user?.displayName || profileForm.displayName,
                        }) ||
                        !!validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword)
                      }
                      color="primary"
                      icon={isSavingPassword ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}
                    >
                      {isSavingPassword ? 'Updating...' : 'Update Password'}
                    </SButton>
                    <SButton
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      color="secondary"
                      disabled={isSavingPassword}
                      type="button"
                    >
                      Cancel
                    </SButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <SButton 
              onClick={handleSaveSettings} 
              disabled={
                isSaving ||
                !!validateRequired(profileForm.firstName, 'First name') ||
                !!validateRequired(profileForm.lastName, 'Last name') ||
                !!validateRequired(profileForm.displayName, 'Display name') ||
                !!validatePhone(profileForm.phoneNumber) ||
                !!validateDate(profileForm.dateOfBirth, 'Date of birth') ||
                !profileForm.gender
              }
              color="primary"
              icon={isSaving ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}
            >
              {isSaving ? t('settings.saving') : t('settings.saveChanges')}
            </SButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsFeature;
