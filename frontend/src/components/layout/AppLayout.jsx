import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';
import './layout.css';

const isLandscapeNow = () =>
  typeof window !== 'undefined' && window.innerWidth > window.innerHeight;

const isMobileNow = () => {
  if (typeof window === 'undefined') return false;
  // Mobile layout applies if:
  // 1. Screen is narrow (<= 768px) -> Phones & Tablets in portrait
  // 2. Screen is very short (<= 500px) -> Phones in landscape
  return window.innerWidth <= 768 || window.innerHeight <= 500;
};

const AppLayout = ({ children, noHeader = false, noFooter = false, gameMode = false }) => {
  const pathname = usePathname();
  const location = { pathname, search: typeof window !== "undefined" ? window.location.search : "" };
  const isUnoGame = location.pathname.startsWith('/games/uno');

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const mobile = isMobileNow();
    const landscape = isLandscapeNow();
    setIsMobile(mobile);
    setIsLandscape(landscape);
    
    if (mobile) {
      setSidebarOpen(false);
    } else {
      const saved = localStorage.getItem('sidebarOpen');
      setSidebarOpen(saved !== null ? saved === 'true' : true);
    }
    const handleResize = () => {
      const mobile = isMobileNow();
      const landscape = isLandscapeNow();
      setIsMobile(mobile);
      setIsLandscape(landscape);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Also listen to the orientation change event for faster response on real devices
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleResize);
      }
    };
  }, []);

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setSidebarOpen(nextState);
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', nextState);
    }
  };

  const handleSetSidebarOpen = (state) => {
    setSidebarOpen(state);
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', state);
    }
  };

  const handleMobileNavClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // UNO game header hiding is managed via CSS (.uno-game-active) in GameTableView.jsx.
  const hideHeader = noHeader;
  const mainFullHeight = noHeader || hideHeader;

  return (
    <div className="app-layout">

      {/* Header — hidden on UNO game in landscape mobile */}
      {!hideHeader && <AppHeader toggleSidebar={toggleSidebar} />}

      {/* Mobile sidebar backdrop overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="layout-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Middle: Sidebar + Main */}
      <div className="layout-middle">

        <AppSidebar
          isOpen={isMounted ? isSidebarOpen : true}
          setSidebarOpen={handleSetSidebarOpen}
          isMobile={isMounted ? isMobile : false}
          onNavClick={handleMobileNavClick}
        />

        <main className={`layout-main${mainFullHeight ? ' layout-main-full' : ''}${gameMode ? ' layout-main-game' : ''}`}>
          {children}
          {!noFooter && !gameMode && <AppFooter />}
        </main>
      </div>

    </div>
  );
};

export default AppLayout;
