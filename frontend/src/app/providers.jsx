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
    <>
      {/* Force root containers to be transparent so the background image shows through */}
      <style>{`
        /* Make all root and layout wrappers completely transparent */
        body, #root, .app-container, .saanvi-home-wrapper, .home-hero-section,
        .app-layout, .layout-middle, .layout-main, .app-sidebar, .app-header,
        .dashboard-layout, .page-wrapper, .layout-sidebar-container,
        .dashboard-container, .page-container, .admin-container,
        .saanvi-public-page, .login-page-wrapper, .login-page-container,
        .auth-page-layout, .signup-content-wrapper {
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          zIndex: -1, // Force it to the background!
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255, 246, 248, 0.2), rgba(255, 246, 248, 0.5)), url(/birthday_balloon_arch.jpg)',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% auto',
          opacity: 0.95
        }}
      />
    </>
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
