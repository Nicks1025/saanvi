import React, { useState } from 'react';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import axios from '@/services/axios.client';

const MfaVerificationFeature = ({ email, supabaseToken, onVerifySuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/login/mfa-verify', { email, code, supabaseToken });
      onVerifySuccess(response.data.data || response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: '#f0fdf4', borderRadius: '50%', marginBottom: '1rem' }}>
          <Shield size={32} color="#166534" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>Two-Factor Authentication</h2>
        <p style={{ color: 'var(--text-2)', marginTop: '0.5rem' }}>
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '2rem' }}>
          <STextField 
            text={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="0 0 0 0 0 0"
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>{error}</p>}
        </div>

        <SButton 
          type="submit" 
          disabled={loading || code.length !== 6} 
          className="w-full p-3 flex justify-center" color="primary"
        >
          {loading ? <Loader2 className="spinner" size={20} /> : 'Verify'}
        </SButton>
        
        <SButton 
          type="button" 
          onClick={onCancel}
          className="w-full p-3 mt-4" color="ghost"
          icon="back"
        >
          Back to Login
        </SButton>
      </form>
    </div>
  );
};

export default MfaVerificationFeature;
