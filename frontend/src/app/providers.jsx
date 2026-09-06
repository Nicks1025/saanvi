"use client";

import React from 'react';
import { AuthProvider, useAuth } from '@/store/AuthContext';
import { ChatProvider } from '@/store/ChatProvider';
import { ThemeProvider } from '@/store/ThemeContext';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import FullScreenLoader from '@/components/common/FullScreenLoader';
import { BirthdayThemeProvider, useBirthdayTheme } from '@/features/home/birthday-theme/BirthdayThemeContext';

function GlobalBirthdayOverlay() {
  const { isBirthdayTheme } = useBirthdayTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isBirthdayTheme) return null;

  return (
    <div
      aria-hidden="true"
      className="birthday-bg-overlay"
    />
  );
}

function AuthLoaderWrapper({ children }) {
  const { isSessionInitializing } = useAuth();
  
  if (isSessionInitializing) {
    return <FullScreenLoader />;
  }
  
  return children;
}

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <Toaster position="top-right">
            {(t) => (
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <div 
                    onClick={() => toast.dismiss(t.id)} 
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' }}
                  >
                    {icon}
                    {message}
                  </div>
                )}
              </ToastBar>
            )}
          </Toaster>
          <AuthLoaderWrapper>
            <BirthdayThemeProvider>
              <GlobalBirthdayOverlay />
              {children}
            </BirthdayThemeProvider>
          </AuthLoaderWrapper>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
