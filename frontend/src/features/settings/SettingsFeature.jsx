import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';
import SDropdown from '../../components/common/SDropdown';
import SButton from '../../components/common/SButton';
import { settingsService } from './services/settingsService';
import { themeOptions, fontOptions } from '../../constants/themeConstants';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import './settings.css';

const SettingsFeature = () => {
  const { user, setUser } = useAuth();
  const { theme, setTheme, font, setFont } = useTheme();
  const { t, i18n } = useTranslation();

  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await settingsService.updateSettings({
        theme,
        font,
        language: i18n.resolvedLanguage || 'en'
      });
      if (response.success) {
        toast.success(t('settings.saveSuccess'));
        const updatedUser = { ...user, theme, font, language: i18n.resolvedLanguage || 'en' };
        setUser(updatedUser);
        sessionStorage.setItem('auth_user', JSON.stringify(updatedUser));
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

  return (
    <div className="settings-container">
      <h1 className="settings-header">
        {t('settings.title')}
      </h1>
      
      <div className="settings-layout">
        <div className="settings-main-col">
          <h2 className="settings-section-title">
            {t('settings.profileInfo')}
          </h2>
          
          <InfoRow label={t('settings.email')} value={user?.email} />
          <InfoRow label={t('settings.firstName')} value={user?.firstName} />
          <InfoRow label={t('settings.lastName')} value={user?.lastName} />
          <InfoRow label={t('settings.displayName')} value={user?.displayName} />
          
          <div style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">
              {t('settings.themePrefs')}
            </h2>

            <div className="settings-info-row" style={{ flexWrap: 'wrap' }}>
              <SDropdown
                label={t('settings.language')}
                value={i18n.resolvedLanguage || 'en'}
                onChange={(lng) => i18n.changeLanguage(lng)}
                options={langOptions}
                width="20%"
              />
            </div>

            <div className="settings-info-row" style={{ flexWrap: 'wrap' }}>
              <SDropdown
                label={t('settings.appTheme')}
                value={theme}
                onChange={setTheme}
                options={themeOptions}
                width="20%"
              />
            </div>

            <div className="settings-info-row" style={{ flexWrap: 'wrap' }}>
              <SDropdown
                label={t('settings.textStyle')}
                value={font}
                onChange={setFont}
                options={fontOptions}
                width="20%"
              />
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h2 className="settings-section-title">
              {t('settings.securityStatus')}
            </h2>
            
            <div className="settings-info-row">
              <div className="settings-info-label">{t('settings.accountStatus')}</div>
              <div className="settings-info-value" style={{ textTransform: 'capitalize' }}>
                <span className={`settings-status-dot ${user?.status === 'active' ? 'settings-status-active' : 'settings-status-inactive'}`}></span>
                {user?.status}
              </div>
            </div>
            
            <div className="settings-info-row">
              <div className="settings-info-label">{t('settings.emailVerified')}</div>
              <div className="settings-info-value">
                {user?.isEmailVerified ? (
                  <><CheckCircle size={18} color="#22c55e" /> {t('settings.yes')}</>
                ) : (
                  <><XCircle size={18} color="#f59e0b" /> {t('settings.no')}</>
                )}
              </div>
            </div>
            
            <div className="settings-info-row">
              <div className="settings-info-label">{t('settings.mfa')}</div>
              <div className="settings-info-value">
                {user?.isMfaEnabled ? (
                  <><CheckCircle size={18} color="#22c55e" /> {t('settings.enabled')}</>
                ) : (
                  <><XCircle size={18} color="#94a3b8" /> {t('settings.disabled')}</>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem' }}>
            <SButton 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              icon={isSaving ? <Loader2 className="spinner" size={18} /> : <Save size={18} />}
            >
              {isSaving ? t('settings.saving') : t('settings.saveChanges')}
            </SButton>
          </div>
        </div>
        
        {user?.profileImageUrl && (
          <div className="settings-profile-col">
            <div className="settings-profile-title">{t('settings.profilePhoto')}</div>
            <img 
              src={user.profileImageUrl} 
              alt="Profile" 
              className="settings-profile-img"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsFeature;
