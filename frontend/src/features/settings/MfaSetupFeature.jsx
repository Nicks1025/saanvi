import React, { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { mfaService } from './services/mfaService';
import toast from 'react-hot-toast';
import { ShieldAlert, Loader2 } from 'lucide-react';
import STextField from '@/components/common/STextField';
import SModal from '@/components/common/SModal';
import SSwitch from '@/components/common/SSwitch';
import { useTranslation } from 'react-i18next';
import './settings.css';

const MfaSetupFeature = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const mfaStatus = Boolean(user?.isMfaEnabled ?? user?.is_mfa_enabled);
  
  // Setup flow state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  const handleCloseSetup = () => {
    setIsSettingUp(false);
    setVerificationCode('');
    setQrCodeUrl('');
    setFactorId('');
    setChallengeId('');
  };

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const factor = await mfaService.enroll();
      setFactorId(factor.id);
      setQrCodeUrl(factor.totp.qr_code);

      // Immediately challenge so we can verify
      const challengeRes = await mfaService.challenge(factor.id);
      setChallengeId(challengeRes.id);
      setVerificationCode('');
      setIsSettingUp(true);
    } catch (err) {
      toast.error(t('admin.mfa.startSetupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error(t('admin.mfa.enterValidCode'));
      return;
    }
    
    setLoading(true);
    try {
      await mfaService.verify({
        factorId,
        challengeId,
        code: verificationCode
      });
      
      toast.success(t('admin.mfa.enabledSuccess'));
      handleCloseSetup();
      setUser(prev => ({ ...prev, isMfaEnabled: true, is_mfa_enabled: true }));
    } catch (err) {
      toast.error(err.response?.data?.error || t('admin.mfa.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await mfaService.unenroll('totp'); 
      
      toast.success(t('admin.mfa.disabledSuccess'));
      setShowDisableModal(false);
      setUser(prev => ({ ...prev, isMfaEnabled: false, is_mfa_enabled: false }));
    } catch (err) {
      toast.error(t('admin.mfa.disableFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="settings-info-row">
        <div className="settings-info-label">{t('admin.mfa.totpTitle')}</div>
        <div className="settings-info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SSwitch
            checked={mfaStatus}
            disabled={loading}
            onChange={(nextChecked) => {
              if (nextChecked) {
                handleStartSetup();
              } else {
                setShowDisableModal(true);
              }
            }}
          />
          {loading && <Loader2 className="spinner" size={16} />}
        </div>
      </div>

      <SModal
        isOpen={isSettingUp}
        title={t('admin.mfa.setupTitle')}
        width="440px"
        onConfirm={handleVerify}
        onCancel={handleCloseSetup}
        confirmText={t('admin.mfa.verify')}
        isProcessing={loading}
        confirmDisabled={loading || verificationCode.length !== 6}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '0.25rem 0' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
            {t('admin.mfa.scanInstructions')}
          </p>

          {qrCodeUrl && (
            <div style={{ background: '#ffffff', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <img
                src={qrCodeUrl}
                alt="MFA QR Code"
                style={{ width: '192px', height: '192px', display: 'block' }}
              />
            </div>
          )}

          <div style={{ width: '100%', maxWidth: '240px' }}>
            <STextField
              text={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              marginBottom="0"
            />
          </div>
        </div>
      </SModal>

      <SModal
        isOpen={showDisableModal}
        title={t('admin.mfa.disableModalTitle')}
        onConfirm={handleDisable}
        onCancel={() => setShowDisableModal(false)}
        confirmText={t('admin.mfa.disableButton')}
        confirmColor="danger"
        isProcessing={loading}
      >
        <div style={{ padding: '0.25rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error, #ef4444)', marginBottom: '0.75rem' }}>
            <ShieldAlert size={24} />
            <span style={{ fontWeight: 600 }}>{t('common.cannot')}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('admin.mfa.disableModalDesc')}
          </p>
        </div>
      </SModal>
    </>
  );
};

export default MfaSetupFeature;
