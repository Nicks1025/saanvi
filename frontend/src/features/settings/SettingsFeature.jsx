import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';
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
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

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
  const [errors, setErrors] = React.useState({});

  const handleProfileChange = (field, value) => {
    let newError = null;

    if (field === 'phoneNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
      if (value.length === 0) {
        newError = t('settings.fieldRequired', 'Field is Required');
      } else if (value.length < 10) {
        newError = t('settings.invalidPhone', 'Invalid number');
      }
    } else {
      // Validate all other string inputs as required
      if (typeof value === 'string' && value.trim().length === 0) {
        newError = t('settings.fieldRequired', 'Field is Required');
      }
    }

    setProfileForm(prev => ({ ...prev, [field]: value }));
    
    if (newError) {
      setErrors(prev => ({ ...prev, [field]: newError }));
    } else if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
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
    // Validate Profile
    const newErrors = {};
    if (!profileForm.firstName?.trim()) newErrors.firstName = t('settings.fieldRequired', 'Field is Required');
    if (!profileForm.lastName?.trim()) newErrors.lastName = t('settings.fieldRequired', 'Field is Required');
    if (!profileForm.displayName?.trim()) newErrors.displayName = t('settings.fieldRequired', 'Field is Required');
    
    if (!profileForm.phoneNumber?.trim()) {
      newErrors.phoneNumber = t('settings.fieldRequired', 'Field is Required');
    } else if (profileForm.phoneNumber.trim().length < 10) {
      newErrors.phoneNumber = t('settings.invalidPhone', 'Invalid number');
    }

    if (!profileForm.dateOfBirth) newErrors.dateOfBirth = t('settings.fieldRequired', 'Field is Required');
    if (!profileForm.gender) newErrors.gender = t('settings.fieldRequired', 'Field is Required');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(t('settings.fixErrors', 'Please fill all required fields'));
      return;
    }

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
                  error={errors.firstName}
                />
                <STextField 
                  label={t('settings.lastName', 'Last Name')} 
                  text={profileForm.lastName} 
                  onChange={(e) => handleProfileChange('lastName', e.target.value)} 
                  required
                  error={errors.lastName}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <STextField 
                  label={t('settings.displayName', 'Display Name')} 
                  text={profileForm.displayName} 
                  onChange={(e) => handleProfileChange('displayName', e.target.value)} 
                  required
                  error={errors.displayName}
                />
                <STextField 
                  label={t('settings.phoneNumber', 'Phone Number')} 
                  text={profileForm.phoneNumber} 
                  onChange={(e) => handleProfileChange('phoneNumber', e.target.value)} 
                  required
                  error={errors.phoneNumber}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <STextField 
                  label={t('settings.dateOfBirth', 'Date of Birth')} 
                  type="date"
                  text={profileForm.dateOfBirth} 
                  onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)} 
                  required
                  error={errors.dateOfBirth}
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
                  {errors.gender && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 500 }}>
                      {errors.gender}
                    </div>
                  )}
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <SButton 
              onClick={handleSaveSettings} 
              disabled={isSaving || !(
                profileForm.firstName?.trim() &&
                profileForm.lastName?.trim() &&
                profileForm.displayName?.trim() &&
                profileForm.phoneNumber?.trim()?.length === 10 &&
                profileForm.dateOfBirth &&
                profileForm.gender
              )}
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
