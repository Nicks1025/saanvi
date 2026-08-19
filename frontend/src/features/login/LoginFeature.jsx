import React, { useState } from 'react';
import STextField from '../../components/common/STextField';
import SButton from '../../components/common/SButton';
import { loginUser, loginWithGoogle } from './service/loginService';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import MfaVerificationFeature from './MfaVerificationFeature';
import './login.css';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const LoginFeatureContent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaData, setMfaData] = useState(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email, password);
      if (data.mfaRequired) {
        setMfaData({ email: data.email, supabaseToken: data.supabaseToken });
      } else if (data.token) {
        login(data.token, data.user, data.supabaseToken);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);
      try {
        const data = await loginWithGoogle(tokenResponse.access_token);
        if (data.mfaRequired) {
          setMfaData({ email: data.email, supabaseToken: data.supabaseToken });
        } else if (data.token) {
          login(data.token, data.user, data.supabaseToken);
          navigate('/dashboard');
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Google authentication failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google authentication failed.');
    }
  });

  if (mfaData) {
    return (
      <div className="login-card">
        <MfaVerificationFeature 
          email={mfaData.email}
          supabaseToken={mfaData.supabaseToken}
          onVerifySuccess={(data) => {
            login(data.token, data.user, data.supabaseToken);
            navigate('/dashboard');
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
      <h2 className="login-title">Login</h2>
      
      {error && (
        <div className="login-error">
          {typeof error === 'string' ? error : (error.message || JSON.stringify(error))}
        </div>
      )}

      <form onSubmit={handleLogin} noValidate>
        <STextField 
          label="Email" 
          type="email"
          placeholder="you@example.com"
          text={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <STextField 
          label="Password" 
          type="password"
          placeholder="••••••••"
          text={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="login-actions">
          {loading ? (
            <div className="login-loading">
              Signing in...
            </div>
          ) : (
            <button 
              type="submit"
              className="login-btn-primary"
            >
              Sign In
            </button>
          )}
        </div>
      </form>

      <div className="login-divider">
        <div className="login-divider-line"></div>
        <span className="login-divider-text">OR</span>
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
        Sign in with Google
      </button>

      <div className="login-footer">
        Don't have an account? <a href="/signup" className="login-footer-link">Sign Up</a>
      </div>
    </div>
  );
};

const LoginFeature = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <LoginFeatureContent />
    </GoogleOAuthProvider>
  );
};

export default LoginFeature;
