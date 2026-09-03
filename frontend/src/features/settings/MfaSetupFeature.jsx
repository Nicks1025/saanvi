import React, { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import axios from '@/services/axios.client';
import toast from 'react-hot-toast';
import { Shield, ShieldAlert, Loader2, QrCode } from 'lucide-react';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import SModal from '@/components/common/SModal';
import './settings.css';

const MfaSetupFeature = () => {
  const { user, supabaseToken, setUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const mfaStatus = user?.is_mfa_enabled || false;
  
  // Setup flow state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/mfa/enroll', { supabaseToken });
      const factor = res.data;
      setFactorId(factor.id);
      setQrCodeUrl(factor.totp.qr_code);

      // Immediately challenge so we can verify
      const challengeRes = await axios.post('/api/mfa/challenge', { supabaseToken, factorId: factor.id });
      setChallengeId(challengeRes.data.id);
      setIsSettingUp(true);
    } catch (err) {
      toast.error('Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post('/api/mfa/verify', {
        supabaseToken,
        factorId,
        challengeId,
        code: verificationCode
      });
      
      toast.success('Two-Factor Authentication enabled successfully!');
      setIsSettingUp(false);
      setUser(prev => ({ ...prev, is_mfa_enabled: true }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await axios.post('/api/mfa/unenroll', { supabaseToken, factorId: 'totp' }); 
      
      toast.success('Two-Factor Authentication disabled');
      setShowDisableModal(false);
      setUser(prev => ({ ...prev, is_mfa_enabled: false }));
    } catch (err) {
      toast.error('Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <div className="settings-info-row">
        <div className="settings-info-label">Two-Factor Authentication (TOTP)</div>
        <div className="settings-info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
            <input 
              type="checkbox" 
              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              checked={mfaStatus || false}
              onChange={(e) => {
                if (e.target.checked) {
                  handleStartSetup();
                } else {
                  setShowDisableModal(true);
                }
              }}
              disabled={loading}
            />
            <div style={{
              width: '44px',
              height: '24px',
              backgroundColor: mfaStatus ? '#22c55e' : '#cbd5e1',
              borderRadius: '9999px',
              position: 'relative',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              boxSizing: 'border-box'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'transform 0.2s',
                transform: mfaStatus ? 'translateX(20px)' : 'translateX(0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} />
            </div>
          </label>
          <span style={{ color: mfaStatus ? '#15803d' : '#64748b', fontWeight: '500', minWidth: '4rem' }}>
            {mfaStatus ? 'Enabled' : 'Disabled'}
          </span>
          {loading && <Loader2 className="spinner" size={16} color="#94a3b8" />}
        </div>
      </div>

      <SModal 
        isOpen={isSettingUp} 
        title="Setup Two-Factor Authentication"
        onCancel={() => { setIsSettingUp(false); }}
      >
        <div style={{ padding: '0 1rem 1rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-2)', marginBottom: '1.5rem' }}>
            Scan this QR code using Google Authenticator or another compatible app, then enter the 6-digit code.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <img src={qrCodeUrl} alt="MFA QR Code" style={{ width: '200px', height: '200px' }} />
            </div>
            
            <div className="w-full max-w-xs" color="primary">
              <STextField 
                text={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="0 0 0 0 0 0"
              />
            </div>

            <SButton 
              onClick={handleVerify} 
              disabled={loading || verificationCode.length !== 6} 
              className="w-full max-w-xs" color="primary"
            >
              {loading ? <Loader2 className="spinner" size={16} /> : 'Verify & Enable'}
            </SButton>
          </div>
        </div>
      </SModal>

      <SModal
        isOpen={showDisableModal}
        title="Disable Two-Factor Authentication"
        onConfirm={handleDisable}
        onCancel={() => setShowDisableModal(false)}
        confirmText="Disable MFA"
        confirmColor="danger"
      >
        <div style={{ padding: '0 1rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
            <ShieldAlert size={24} />
            <span style={{ fontWeight: '600' }}>Warning</span>
          </div>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
            Are you sure you want to disable Two-Factor Authentication? Removing this extra layer of security will make your account more vulnerable to unauthorized access.
          </p>
        </div>
      </SModal>
    </>
  );
};

export default MfaSetupFeature;
