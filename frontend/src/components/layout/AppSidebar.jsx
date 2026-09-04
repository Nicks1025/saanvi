import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Settings, Gamepad2, ChevronDown, ChevronRight, Shield, LogOut, MessageSquare, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/AuthContext';
import SButton from '../common/SButton';
import './layout.css';

const AppSidebar = ({ isOpen, setSidebarOpen, isMobile, onNavClick }) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const location = { pathname, search: typeof window !== "undefined" ? window.location.search : "" };
  const { user, logout } = useAuth();
  const userPermissions = user?.permissions || [];
  
  const [isGamesOpen, setIsGamesOpen] = useState(location.pathname.startsWith('/games'));
  const [isAdminOpen, setIsAdminOpen] = useState(location.pathname.startsWith('/admin'));


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
    <aside className={`app-sidebar ${isOpen ? 'open' : 'closed'}${isMobile ? ' sidebar-mobile' : ''}`}>
      <nav className="sidebar-nav">
        <Link href="/dashboard" className={pathname.startsWith("/dashboard") ? "sidebar-link active" : "sidebar-link"} title={t('navigation.dashboard')} onClick={onNavClick}>
          <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
          <span className="sidebar-link-text">{t('navigation.dashboard')}</span>
        </Link>

        {userPermissions.includes('chat.access') && (
          <Link href="/chat" className={pathname.startsWith("/chat") ? "sidebar-link active" : "sidebar-link"} title={t('navigation.chat', 'Chat')} onClick={onNavClick}>
            <MessageSquare size={20} style={{ flexShrink: 0 }} />
            <span className="sidebar-link-text">{t('navigation.chat', 'Chat')}</span>
          </Link>
        )}

        {(userPermissions.includes('admin.users.view') || userPermissions.includes('admin.roles.view') || userPermissions.includes('admin.system.health') || userPermissions.includes('admin.sql_editor') || userPermissions.includes('admin.email_templates.view') || userPermissions.includes('admin.workflows.view')) && (
          <div className="sidebar-group">
            <button 
              className={`sidebar-link sidebar-group-btn ${location.pathname.startsWith('/admin') ? 'active-parent' : ''}`} 
              onClick={handleAdminClick}
              title={t('navigation.admin', 'Admin')}
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
                {userPermissions.includes('admin.users.view') && (
                  <Link href="/admin/users" className={pathname.startsWith("/admin/users") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.users', 'Users')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.users', 'Users')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.roles.view') && (
                  <Link href="/admin/roles" className={pathname.startsWith("/admin/roles") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.roles', 'Roles')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.roles', 'Roles')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.system.health') && (
                  <Link href="/admin/health" className={pathname.startsWith("/admin/health") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.system_health', 'System Health')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.system_health', 'System Health')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.sql_editor') && (
                  <Link href="/admin/sql-editor" className={pathname.startsWith("/admin/sql-editor") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.sql_editor', 'SQL Editor')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.sql_editor', 'SQL Editor')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.email_templates.view') && (
                  <Link href="/admin/email-templates" className={pathname.startsWith("/admin/email-templates") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.email_templates', 'Email Templates')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.email_templates', 'Email Templates')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.dynamic_variables.view') && (
                  <Link href="/admin/dynamic-variables" className={pathname.startsWith("/admin/dynamic-variables") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.dynamic_variables', 'Dynamic Variables')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.dynamic_variables', 'Dynamic Variables')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.workflows.view') && (
                  <Link href="/admin/workflows" className={pathname.startsWith("/admin/workflows") || pathname.startsWith("/admin/workflow/") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.workflows', 'Workflows')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.workflows', 'Workflows')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.workflows.view') && (
                  <Link href="/admin/system-events" className={pathname.startsWith("/admin/system-events") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.system_events', 'System Events')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.system_events', 'System Events')}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {(userPermissions.includes('games.uno') || userPermissions.includes('games.words.wordsearch') || userPermissions.includes('games.puzzles.arrowpuzzle')) && (
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
                {userPermissions.includes('games.uno') && (
                  <Link href="/games/uno" className={pathname.startsWith("/games/uno") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.uno', 'UNO')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.uno', 'UNO')}</span>
                  </Link>
                )}
              {userPermissions.includes('games.words.wordsearch') && (
                <Link href="/games/word-search" className={pathname.startsWith("/games/word-search") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.word_search', 'Word Search')} onClick={onNavClick}>
                  <span className="sidebar-link-text">{t('navigation.word_search', 'Word Search')}</span>
                </Link>
              )}
              {userPermissions.includes('games.puzzles.arrowpuzzle') && (
                <Link href="/games/arrow-puzzle" className={pathname.startsWith("/games/arrow-puzzle") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title="Arrow Puzzle" onClick={onNavClick}>
                  <span className="sidebar-link-text">Arrow Puzzle</span>
                </Link>
              )}
              </div>
            )}
          </div>
        )}
        <Link href="/settings" className={pathname.startsWith("/settings") ? "sidebar-link active" : "sidebar-link"} title={t('navigation.settings')} onClick={onNavClick}>
          <Settings size={20} style={{ flexShrink: 0 }} />
          <span className="sidebar-link-text">{t('navigation.settings')}</span>
        </Link>
      </nav>

      <SButton 
        onClick={logout}
        className="sidebar-link mt-auto"
        title={t('navigation.logout')}
        color="sidebar"
      >
        <LogOut size={20} style={{ flexShrink: 0 }} />
        <span className="sidebar-link-text">{t('navigation.logout')}</span>
      </SButton>
    </aside>
  );
};

export default AppSidebar;
