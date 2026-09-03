"use client";
import React, { useEffect } from 'react';
import HomeNavbar from '@/features/home/components/HomeNavbar';
import SignupFeature from '@/features/signup/SignupFeature';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'next/navigation';
import '../../features/signup/signup.css';

export default function SignupClient() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Note: title is also handled by metadata now
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="saanvi-public-page auth-page-layout">
      <HomeNavbar />
      <div className="signup-content-wrapper">
        <SignupFeature />
      </div>
    </div>
  );
};
