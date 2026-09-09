"use client";
import React, { useEffect } from 'react';
import HomeNavbar from '@/features/home/components/HomeNavbar';
import LoginFeature from '@/features/login/LoginFeature';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'next/navigation';
import RedirectLoader from '@/components/common/RedirectLoader';

export default function LoginClient() {
  const { isAuthenticated, loading, isSessionInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  // Show the progress bar loader instead of flashing the login form when:
  // 1. Auth state is still being resolved from cookies on initial load
  // 2. User just logged in and we are about to redirect
  if (loading || isSessionInitializing || (!loading && isAuthenticated)) {
    return (
      <RedirectLoader
        message={isAuthenticated ? 'Redirecting to dashboard…' : 'Loading…'}
        subMessage={isAuthenticated ? 'Almost there, setting up your workspace.' : 'Checking your session.'}
      />
    );
  }

  return (
    <div className="saanvi-public-page login-page-wrapper">
      <HomeNavbar />
      <div className="login-page-container">
        <LoginFeature />
      </div>
    </div>
  );
};

