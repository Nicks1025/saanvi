import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './layout.css';

const AppHeader = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={toggleSidebar} className="header-menu-btn" aria-label="Toggle Menu">
          <Menu size={24} />
        </button>
        <div className="header-logo">
          <img src="/saanvi_logo.png" alt="Saanvi Logo" />
          {t('navigation.brand')}
        </div>
      </div>
      
      <div className="header-user-section">
        <div className="header-user-info">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="Profile" className="header-avatar" />
          ) : (
            <div className="header-avatar-placeholder">
              <User size={16} />
            </div>
          )}
          <span className="header-user-name">
            {user?.displayName || user?.firstName || user?.email}
          </span>
        </div>
        
        <button 
          onClick={logout}
          className="header-logout-btn"
          title={t('navigation.logout')}
        >
          <LogOut size={16} />
          {t('navigation.logout')}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
