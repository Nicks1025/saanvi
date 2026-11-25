import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/store/AuthContext';
import { LayoutDashboard, MessageSquare, Shield, ChevronDown, ChevronRight, Gamepad2, Mail, Settings, LogOut, FileText, Box, ClipboardList } from 'lucide-react';
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
  const [isEmailOpen, setIsEmailOpen] = useState(location.pathname.startsWith('/email'));


  const handleAdminClick = () => {
    if (!isOpen && setSidebarOpen) {
      setSidebarOpen(true);
      setIsAdminOpen(true);
    } else {
      setIsAdminOpen(!isAdminOpen);
    }
  };

  const handleEmailClick = () => {
    if (!isOpen && setSidebarOpen) {
      setSidebarOpen(true);
      setIsEmailOpen(true);
    } else {
      setIsEmailOpen(!isEmailOpen);
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
          <Link href="/chat" className={pathname.startsWith("/chat") ? "sidebar-link active" : "sidebar-link"} title={t('navigation.chat')} onClick={onNavClick}>
            <MessageSquare size={20} style={{ flexShrink: 0 }} />
            <span className="sidebar-link-text">{t('navigation.chat')}</span>
          </Link>
        )}

        {(userPermissions.includes('admin.users.view') || userPermissions.includes('admin.roles.view') || userPermissions.includes('admin.system.health') || userPermissions.includes('admin.sql_editor') || userPermissions.includes('admin.email_templates.view') || userPermissions.includes('admin.dynamic_variables.view') || userPermissions.includes('admin.email_logs.view')) && (
          <div className="sidebar-group">
            <button
              className={`sidebar-link sidebar-group-btn ${location.pathname.startsWith('/admin') ? 'active-parent' : ''}`}
              onClick={handleAdminClick}
              title={t('navigation.admin')}
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
                  <Link href="/admin/users" className={pathname.startsWith("/admin/users") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.users')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.users')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.roles.view') && (
                  <Link href="/admin/roles" className={pathname.startsWith("/admin/roles") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.roles')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.roles')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.system.health') && (
                  <Link href="/admin/health" className={pathname.startsWith("/admin/health") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.system_health')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.system_health')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.sql_editor') && (
                  <Link href="/admin/sql-editor" className={pathname.startsWith("/admin/sql-editor") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.sql_editor')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.sql_editor')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.email_templates.view') && (
                  <Link href="/admin/email-templates" className={pathname.startsWith("/admin/email-templates") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.email_templates')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.email_templates')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.dynamic_variables.view') && (
                  <Link href="/admin/dynamic-variables" className={pathname.startsWith("/admin/dynamic-variables") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.dynamic_variables')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.dynamic_variables')}</span>
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
              title={t('navigation.games')}
            >
              <Gamepad2 size={20} style={{ flexShrink: 0 }} />
              <span className="sidebar-link-text">{t('navigation.games')}</span>
              {isOpen && (
                <span className="sidebar-group-toggle" style={{ marginLeft: 'auto' }}>
                  {isGamesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
            </button>

            {isGamesOpen && (
              <div className="sidebar-sub-menu">
                {userPermissions.includes('games.uno') && (
                  <Link href="/games/uno" className={pathname.startsWith("/games/uno") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.uno')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.uno')}</span>
                  </Link>
                )}
                {userPermissions.includes('games.words.wordsearch') && (
                  <Link href="/games/word-search" className={pathname.startsWith("/games/word-search") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.word_search')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.word_search')}</span>
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
        {(userPermissions.includes('admin.email.logs') || userPermissions.includes('admin.email.campaign.get')) && (
          <div className="sidebar-group">
            <button
              className={`sidebar-link sidebar-group-btn ${location.pathname.startsWith('/email') ? 'active-parent' : ''}`}
              onClick={handleEmailClick}
              title={t('navigation.email')}
            >
              <Mail size={20} style={{ flexShrink: 0 }} />
              <span className="sidebar-link-text">{t('navigation.email')}</span>
              {isOpen && (
                <span className="sidebar-group-toggle" style={{ marginLeft: 'auto' }}>
                  {isEmailOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
            </button>

            {isEmailOpen && (
              <div className="sidebar-sub-menu">
                {userPermissions.includes('admin.email.logs') && (
                  <Link href="/email/logs" className={pathname.startsWith("/email/logs") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.email_logs')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.email_logs')}</span>
                  </Link>
                )}
                {userPermissions.includes('admin.email.campaign.get') && (
                  <Link href="/email/campaigns" className={pathname.startsWith("/email/campaigns") ? "sidebar-link sub-link active" : "sidebar-link sub-link"} title={t('navigation.email_campaigns')} onClick={onNavClick}>
                    <span className="sidebar-link-text">{t('navigation.email_campaigns')}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {userPermissions.includes('objects.view') && (
          <Link href="/objects" className={pathname.startsWith("/objects") ? "sidebar-link active" : "sidebar-link"} title={t('navigation.objects')} onClick={onNavClick}>
            <Box size={20} style={{ flexShrink: 0 }} />
            <span className="sidebar-link-text">{t('navigation.objects')}</span>
          </Link>
        )}
        {userPermissions.includes('form_wizards.view') && (
          <Link href="/form-wizards" className={pathname.startsWith("/form-wizards") ? "sidebar-link active" : "sidebar-link"} title={t('navigation.formWizards')} onClick={onNavClick}>
            <ClipboardList size={20} style={{ flexShrink: 0 }} />
            <span className="sidebar-link-text">{t('navigation.formWizards')}</span>
          </Link>
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
