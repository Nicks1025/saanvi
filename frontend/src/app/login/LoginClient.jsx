"use client";
import React, { useEffect } from 'react';
import HomeNavbar from '@/features/home/components/HomeNavbar';
import LoginFeature from '@/features/login/LoginFeature';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginClient() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Note: title is also handled by metadata now
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="saanvi-public-page login-page-wrapper">
      <HomeNavbar />
      <div className="login-page-container">
        <LoginFeature />
      </div>
    </div>
  );
};
