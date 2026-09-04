"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/AuthContext';
import SButton from '@/components/common/SButton';

export default function NotFoundClient() {
  const [countdown, setCountdown] = useState(8);
  const navigate = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  const targetPath = isAuthenticated ? '/dashboard' : '/';
  const targetLabel = isAuthenticated ? 'Dashboard' : 'Home';

  useEffect(() => {
    if (countdown === 0) {
      navigate.replace(targetPath);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate, targetPath]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      background: 'var(--bg-main)', 
      color: 'var(--text-h)',
      padding: '2rem'
    }}>
      <AlertCircle size={72} style={{ color: 'var(--primary, #4f46e5)', marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 600 }}>
        {t('not_found.title', 'Page Not Found')}
      </h1>
      <p style={{ 
        fontSize: '1.1rem', 
        color: 'var(--text-p)', 
        marginBottom: '2.5rem', 
        textAlign: 'center', 
        maxWidth: '450px',
        lineHeight: 1.6
      }}>
        {t('not_found.message', 'The page you are looking for does not exist or has been moved.')}
      </p>
      
      <div style={{ 
        padding: '1.25rem 2.5rem', 
        background: 'var(--bg-card)', 
        borderRadius: '12px', 
        border: '1px solid var(--border)', 
        marginBottom: '2.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-h)' }}>
          {t('not_found.redirecting', `Redirecting to ${targetLabel} in`)} <strong style={{ color: 'var(--primary)', fontSize: '1.2rem', padding: '0 0.2rem' }}>{countdown}</strong> {t('not_found.seconds', 'seconds')}...
        </p>
      </div>

      <SButton 
        onClick={() => navigate.push(targetPath)}
        style={{ padding: '0.75rem 2rem', fontSize: '1.05rem' }}
        icon="home"
      >
        Return to {targetLabel}
      </SButton>
    </div>
  );
};
