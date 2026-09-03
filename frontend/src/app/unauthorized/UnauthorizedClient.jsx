"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import SButton from '@/components/common/SButton';

export default function UnauthorizedClient() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      router.replace('/dashboard');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

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
      <ShieldAlert size={72} style={{ color: 'var(--danger, #ef4444)', marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 600 }}>Access Denied</h1>
      <p style={{ 
        fontSize: '1.1rem', 
        color: 'var(--text-p)', 
        marginBottom: '2.5rem', 
        textAlign: 'center', 
        maxWidth: '450px',
        lineHeight: 1.6
      }}>
        You do not have the necessary permissions to access this page. Please contact your administrator if you believe this is a mistake.
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
          Redirecting to dashboard in <strong style={{ color: 'var(--primary)', fontSize: '1.2rem', padding: '0 0.2rem' }}>{countdown}</strong> seconds...
        </p>
      </div>

      <SButton 
        onClick={() => router.replace('/dashboard')} 
        style={{ padding: '0.75rem 2rem', fontSize: '1.05rem' }}
      >
        Return to Dashboard Now
      </SButton>
    </div>
  );
};
