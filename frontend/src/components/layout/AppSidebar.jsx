import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Gamepad2, ChevronDown, ChevronRight, Shield, LogOut, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import SButton from '../common/SButton';
import './layout.css';

const AppSidebar = ({ isOpen, setSidebarOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();
  const userPermissions = user?.permissions || [];
  
  const [isGamesOpen, setIsGamesOpen] = useState(location.pathname.startsWith('/games'));
  const [isAdminOpen, setIsAdminOpen] = useState(location.pathname.startsWith('/admin'));

  const getNavLinkClass = ({ isActive }) => {
    return isActive ? 'sidebar-link active' : 'sidebar-link';
  };

  const getSubNavLinkClass = ({ isActive }) => {
    return isActive ? 'sidebar-link sub-link active' : 'sidebar-link sub-link';
  };

  const handleAdminClick = () => {
    if (!isOpen && setSidebarOpen) {
      setSidebarOpen(true);
      setIsAdminOpen(true);
    } else {
      setIsAdminOpen(!isAdminOpen);
    }
  };

  const handleGamesClick = () => {
    if (!isOpen && setSidebarOpen) {
      setSidebarOpen(true);
      setIsGamesOpen(true);
    } else {
      setIsGamesOpen(!isGamesOpen);
    }
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={getNavLinkClass} title={t('navigation.dashboard')}>
          <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
          <span className="sidebar-link-text">{t('navigation.dashboard')}</span>
        </NavLink>

        {userPermissions.includes('chat.access') && (
          <NavLink to="/chat" className={getNavLinkClass} title={t('navigation.chat', 'Chat')}>
            <MessageSquare size={20} style={{ flexShrink: 0 }} />
            <span className="sidebar-link-text">{t('navigation.chat', 'Chat')}</span>
          </NavLink>
        )}

        {(userPermissions.includes('admin.users') || userPermissions.includes('admin.roles') || userPermissions.includes('admin.system.health')) && (
          <div className="sidebar-group">
            <button 
              className={`sidebar-link sidebar-group-btn ${location.pathname.startsWith('/admin') ? 'active-parent' : ''}`} 
              onClick={handleAdminClick}
              title="Admin"
            >
              <Shield size={20} style={{ flexShrink: 0 }} />
              <span className="sidebar-link-text">{t('navigation.admin')}</span>
              {isOpen && (
                <span className="sidebar-group-toggle" style={{ marginLeft: 'auto' }}>
                  {isAdminOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
            </button>
            
            {isAdminOpen && (
              <div className="sidebar-sub-menu">
                {userPermissions.includes('admin.users') && (
                  <NavLink to="/admin/users" className={getSubNavLinkClass} title={t('navigation.users', 'Users')}>
                    <span className="sidebar-link-text">{t('navigation.users', 'Users')}</span>
                  </NavLink>
                )}
                {userPermissions.includes('admin.roles') && (
                  <NavLink to="/admin/roles" className={getSubNavLinkClass} title={t('navigation.roles', 'Roles')}>
                    <span className="sidebar-link-text">{t('navigation.roles', 'Roles')}</span>
                  </NavLink>
                )}
                {userPermissions.includes('admin.system.health') && (
                  <NavLink to="/admin/health" className={getSubNavLinkClass} title={t('navigation.system_health', 'System Health')}>
                    <span className="sidebar-link-text">{t('navigation.system_health', 'System Health')}</span>
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {userPermissions.includes('games.words.wordsearch') && (
          <div className="sidebar-group">
            <button 
              className={`sidebar-link sidebar-group-btn ${location.pathname.startsWith('/games') ? 'active-parent' : ''}`} 
              onClick={handleGamesClick}
              title={t('navigation.games', 'Games')}
            >
              <Gamepad2 size={20} style={{ flexShrink: 0 }} />
              <span className="sidebar-link-text">{t('navigation.games', 'Games')}</span>
              {isOpen && (
                <span className="sidebar-group-toggle" style={{ marginLeft: 'auto' }}>
                  {isGamesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
            </button>
            
            {isGamesOpen && (
              <div className="sidebar-sub-menu">
                <NavLink to="/games/word-search" className={getSubNavLinkClass} title={t('navigation.word_search', 'Word Search')}>
                  <span className="sidebar-link-text">{t('navigation.word_search', 'Word Search')}</span>
                </NavLink>
              </div>
            )}
          </div>
        )}
        
        <NavLink to="/settings" className={getNavLinkClass} title={t('navigation.settings')}>
          <Settings size={20} style={{ flexShrink: 0 }} />
          <span className="sidebar-link-text">{t('navigation.settings')}</span>
        </NavLink>
      </nav>

      <SButton 
        onClick={logout}
        className="sidebar-link"
        title={t('navigation.logout')}
        style={{ 
          marginTop: 'auto', 
          border: 'none', 
          borderTop: '1px solid var(--border)',
          background: 'transparent', 
          cursor: 'pointer', 
          textAlign: 'left', 
          width: '100%', 
          padding: '1rem 1.5rem',
          color: 'var(--text-h)',
          borderRadius: 0,
          justifyContent: 'flex-start'
        }}
      >
        <LogOut size={20} style={{ flexShrink: 0 }} />
        <span className="sidebar-link-text">{t('navigation.logout')}</span>
      </SButton>
    </aside>
  );
};

export default AppSidebar;
