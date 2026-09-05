"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SButton from '@/components/common/SButton';
import STextField from '@/components/common/STextField';
import { resendVerification } from '@/features/signup/service/signupService';
import '@/features/signup/signup.css'; // Reuse signup styles

export default function AuthCallbackPage() {
  const navigate = useRouter();
  const [status, setStatus] = useState('verifying');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // If Supabase redirected here with a hash containing access_token
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('access_token')) {
        // Verification was successful (token is present)
        setStatus('success');
        // Clear the hash from the URL
        window.history.replaceState(null, '', window.location.pathname);
      } else if (window.location.hash.includes('error_description') || window.location.search.includes('error_description')) {
        // Verification failed or expired
        setStatus('error');
      } else {
        // Fallback for cases where it might already be processed or empty
        setStatus('success');
      }
    }
  }, []);

  const handleResend = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setResending(true);
    setErrorMsg('');
    setResendSuccess('');
    try {
      const data = await resendVerification(email);
      setResendSuccess(data.message || 'A new verification email has been sent. Please check your inbox.');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="signup-layout">
      <div className="signup-content-area" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="signup-card" style={{ maxWidth: '500px', margin: 'auto', textAlign: 'center' }}>
          {status === 'verifying' && (
            <>
              <h2 className="signup-form-title">Verifying your email...</h2>
              <p className="signup-form-subtitle">Please wait while we confirm your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
              <h2 className="signup-form-title">Email Verified Successfully!</h2>
              <p className="signup-form-subtitle">
                Your account is now active. You can log in to access the platform.
              </p>
              <div className="signup-actions" style={{ marginTop: '30px' }}>
                <SButton type="button" color="primary" onClick={() => navigate.push('/login')}>
                  Go to Login
                </SButton>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
              <h2 className="signup-form-title">Verification link expired</h2>
              <p className="signup-form-subtitle">
                This verification link is no longer valid or has already been used.
              </p>

              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <STextField 
                  label="Email Address" 
                  type="email"
                  placeholder="Enter your email to resend"
                  text={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div className="login-error" style={{ color: 'red', marginTop: '10px' }}>
                  {errorMsg}
                </div>
              )}
              
              {resendSuccess && (
                <div className="login-success" style={{ color: 'green', background: '#e8f5e9', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                  {resendSuccess}
                </div>
              )}

              <div className="signup-actions" style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <SButton type="button" onClick={handleResend} disabled={resending} style={{ background: '#f0f0f0', color: '#333' }}>
                  {resending ? 'Sending...' : 'Send new verification email'}
                </SButton>
                <SButton type="button" color="primary" onClick={() => navigate.push('/login')}>
                  Go to Login
                </SButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
