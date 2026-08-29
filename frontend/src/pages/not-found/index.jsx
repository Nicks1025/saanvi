import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HomeNavbar from '../../features/home/components/HomeNavbar';

const NotFoundPage = () => {
  const [countdown, setCountdown] = useState(8);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Page Not Found — Saanvi";
    if (countdown === 0) {
      navigate('/', { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate]);

  return (
    <div className="saanvi-public-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <HomeNavbar />
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        textAlign: 'center',
        padding: '2.5rem',
        maxWidth: '520px',
        margin: 'auto',
        background: 'rgba(17, 24, 39, 0.88)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
        zIndex: 1
      }}>
        <AlertCircle size={56} style={{ color: '#818cf8', marginBottom: '1.25rem' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#ffffff' }}>
          {t('not_found.title', 'Page Not Found')}
        </h1>
        <p style={{ fontSize: '0.98rem', color: '#94a3b8', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
          {t('not_found.message', 'The page you are looking for does not exist or has been moved.')}
        </p>
        <div style={{ 
          backgroundColor: 'rgba(15, 23, 42, 0.8)', 
          padding: '0.75rem 1.25rem', 
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.5rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
            {t('not_found.redirecting', 'Redirecting to Home in')} <strong style={{ color: '#818cf8', fontSize: '1.1rem' }}>{countdown}</strong> {t('not_found.seconds', 'seconds')}...
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            background: '#4f46e5',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.94rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer'
          }}
        >
          <Home size={16} /> Return to Home
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
