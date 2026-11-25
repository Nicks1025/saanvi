import React, { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import { verifyMfa } from './service/loginService';
import { useTranslation } from 'react-i18next';

const MfaVerificationFeature = ({ email, mfaTicket, onVerifySuccess, onCancel }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      const data = await verifyMfa(email, code, mfaTicket);
      onVerifySuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || t('admin.mfa.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div className="mfa-verify-header text-center mb-6">
        <div className="mfa-shield-icon-wrapper inline-flex p-4 rounded-full mb-4">
          <Shield size={32} color="#166534" />
        </div>
        <h2 className="text-2xl font-semibold m-0">{t('admin.mfa.title')}</h2>
        <p className="text-secondary mt-2">
          {t('admin.mfa.enterCode')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <STextField 
            text={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="0 0 0 0 0 0"
          />
          {error && <p className="text-danger text-sm mt-2 text-center">{error}</p>}
        </div>

        <SButton 
          type="submit" 
          disabled={loading || code.length !== 6} 
          className="w-full p-3 flex justify-center" 
          color="primary"
        >
          {loading ? <Loader2 className="spinner" size={20} /> : t('admin.mfa.verify')}
        </SButton>
        
        <SButton 
          type="button" 
          onClick={onCancel}
          className="w-full p-3 mt-4" 
          color="ghost"
          icon="back"
        >
          {t('admin.mfa.backToLogin')}
        </SButton>
      </form>
    </div>
  );
};

export default MfaVerificationFeature;
