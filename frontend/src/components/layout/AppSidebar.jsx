import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Gamepad2, ChevronDown, ChevronRight, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './layout.css';

const AppSidebar = ({ isOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isGamesOpen, setIsGamesOpen] = useState(location.pathname.startsWith('/games'));

  const getNavLinkClass = ({ isActive }) => {
    return isActive ? 'sidebar-link active' : 'sidebar-link';
  };

  const getSubNavLinkClass = ({ isActive }) => {
    return isActive ? 'sidebar-link sub-link active' : 'sidebar-link sub-link';
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={getNavLinkClass} title={t('navigation.dashboard')}>
          <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
          <span className="sidebar-link-text">{t('navigation.dashboard')}</span>
        </NavLink>

        <div className="sidebar-group">
          <button 
            className={`sidebar-link sidebar-group-btn ${location.pathname.startsWith('/games') ? 'active-parent' : ''}`} 
            onClick={() => setIsGamesOpen(!isGamesOpen)}
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
                <Type size={20} style={{ flexShrink: 0 }} />
                <span className="sidebar-link-text">{t('navigation.word_search', 'Word Search')}</span>
              </NavLink>
            </div>
          )}
        </div>
        
        <NavLink to="/settings" className={getNavLinkClass} title={t('navigation.settings')}>
          <Settings size={20} style={{ flexShrink: 0 }} />
          <span className="sidebar-link-text">{t('navigation.settings')}</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default AppSidebar;
