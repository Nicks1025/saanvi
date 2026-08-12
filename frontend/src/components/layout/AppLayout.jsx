import React, { useState } from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';
import { Menu } from 'lucide-react';
import './layout.css';

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setSidebarOpen(nextState);
    localStorage.setItem('sidebarOpen', nextState);
  };

  return (
    <div className="app-layout">
      
      {/* Header - Full 100% Width */}
      <AppHeader toggleSidebar={toggleSidebar} />

      {/* Middle section: Sidebar + Main Content */}
      <div className="layout-middle">
        
        {/* Sidebar - Full height between Header and Footer */}
        <AppSidebar isOpen={isSidebarOpen} />
        
        <main className="layout-main">
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>
      
      {/* Footer - Full 100% Width */}
      <AppFooter />

    </div>
  );
};

export default AppLayout;
