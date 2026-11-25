"use client";
import React, { useState } from 'react';
import STextField from '@/components/common/STextField';
import SButton from '@/components/common/SButton';
import { loginUser, loginWithGoogle } from './service/loginService';
import { resendVerification } from '../signup/service/signupService';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import MfaVerificationFeature from './MfaVerificationFeature';
import { useTranslation } from 'react-i18next';
import './login.css';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';

const LoginFeatureContent = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaData, setMfaData] = useState(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  
  const navigate = useRouter();
  const { login } = useAuth();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get('reason');
      if (reason === 'session_expired') {
        setError(t('admin.auth.sessionExpired', 'Your session has expired. Please sign in again.'));
      } else if (reason === 'invalidsession') {
        setError(t('admin.auth.invalidSession', 'Your session is invalid. Please sign in again.'));
      }
    }
  }, [t]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setResendSuccess('');

    if (!email || !password) {
      setError(t('admin.auth.fillAllFields'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('admin.auth.validEmail'));
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email, password);
      if (data.mfaRequired) {
        setMfaData({ email: data.email, mfaTicket: data.mfaTicket });
      } else if (data.token) {
        login(data.token);
        navigate.push('/dashboard');
      }
    } catch (err) {
      const errCode = err.response?.data?.code;
      if (errCode === 'UNVERIFIED_EMAIL') {
        setIsUnverified(true);
      }
      setError(err.response?.data?.error || err.message || t('admin.auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    setResendSuccess('');
    try {
      const data = await resendVerification(email);
      setResendSuccess(data.message || t('admin.auth.resendSuccess'));
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('admin.auth.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);
      try {
        const data = await loginWithGoogle(tokenResponse.access_token);
        if (data.mfaRequired) {
          setMfaData({ email: data.email, mfaTicket: data.mfaTicket });
        } else if (data.token) {
          login(data.token);
          navigate.push('/dashboard');
        }
      } catch (err) {
        const errCode = err.response?.data?.code;
        if (errCode === 'UNVERIFIED_EMAIL') {
          setIsUnverified(true);
        }
        setError(err.response?.data?.error || err.message || t('admin.auth.googleAuthFailed'));
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError(t('admin.auth.googleAuthFailed'));
    }
  });

  if (mfaData) {
    return (
      <div className="login-card">
        <MfaVerificationFeature 
          email={mfaData.email}
          mfaTicket={mfaData.mfaTicket}
          onVerifySuccess={(data) => {
            login(data.token);
            navigate.push('/dashboard');
          }}
          onCancel={() => {
            setMfaData(null);
            setError('');
          }}
        />
      </div>
    );
  }

  return (
    <div className="login-card">
      <h2 className="login-title">{t('admin.auth.login')}</h2>
      
      {error && (
        <div className="login-error">
          {typeof error === 'string' ? error : (error.message || JSON.stringify(error))}
        </div>
      )}

      {resendSuccess && (
        <div className="login-success text-center mb-4 p-3 rounded">
          {resendSuccess}
        </div>
      )}

      {isUnverified && (
        <div className="mb-4 text-center">
          <SButton
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            color="secondary"
            className="w-full"
          >
            {resending ? t('admin.auth.resending') : t('admin.auth.resendVerification')}
          </SButton>
        </div>
      )}

      <form onSubmit={handleLogin} noValidate>
        <STextField 
          label={t('admin.auth.email')} 
          type="email"
          placeholder="you@example.com"
          text={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <STextField 
          label={t('admin.auth.password')} 
          type="password"
          placeholder="••••••••"
          text={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="login-actions">
          <SButton 
            type="submit"
            color="primary"
            className="login-btn-primary w-full"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('admin.auth.login')}
          </SButton>
        </div>
      </form>

      <div className="login-divider">
        <div className="login-divider-line"></div>
        <span className="login-divider-text">{t('admin.auth.or')}</span>
        <div className="login-divider-line"></div>
      </div>

      <button 
        type="button"
        onClick={handleGoogleSignIn}
        className="login-btn-google"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {t('admin.auth.googleSignIn')}
      </button>

      <div className="login-footer">
        {t('admin.auth.dontHaveAccount')}{' '}
        <a href="/signup" className="login-footer-link">{t('admin.auth.signUp')}</a>
      </div>
    </div>
  );
};

const LoginFeature = () => {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <LoginFeatureContent />
    </GoogleOAuthProvider>
  );
};

export default LoginFeature;
