import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NotFoundPage = () => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (countdown === 0) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      width: '100vw',
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: 'var(--bg)',
      boxSizing: 'border-box'
    }}>
      <AlertCircle size={64} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
        {t('not_found.title', 'Page Not Found')}
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-h)', marginBottom: '2rem' }}>
        {t('not_found.message', 'The page you are looking for does not exist or has been moved.')}
      </p>
      <div style={{ 
        backgroundColor: 'var(--code-bg)', 
        padding: '1rem 2rem', 
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
          {t('not_found.redirecting', 'Redirecting to Dashboard in')} <strong style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{countdown}</strong> {t('not_found.seconds', 'seconds')}...
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
