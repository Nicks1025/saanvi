import React from 'react';
import { useAuth } from '@/store/AuthContext';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Gamepad2, Shield, Settings } from 'lucide-react';
import Link from 'next/link';
import './dashboard.css';

const DashboardFeature = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const userPermissions = user?.permissions || [];
  
  const hasAdmin = userPermissions.includes('admin.users.view') || 
                   userPermissions.includes('admin.roles.view') || 
                   userPermissions.includes('admin.system.health') || 
                   userPermissions.includes('admin.workflows.view');
                   
  const hasChat = userPermissions.includes('chat.access');
  const hasGames = userPermissions.includes('games.uno') || userPermissions.includes('games.words.wordsearch');

  return (
    <div className="dashboard-container page-container">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h1 className="dashboard-header">
            {t('dashboard.welcome', { name: user?.firstName || user?.displayName || user?.email?.split('@')[0] || 'User' })}
          </h1>
          <p className="dashboard-description">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="dashboard-main-layout">
        {/* Left Column: Quick Links */}
        <div>
          <h2 className="dashboard-section-title">Quick Actions</h2>
          <div className="dashboard-quick-links">
            
            {hasChat && (
              <Link href="/chat" className="quick-link-card">
                <div className="quick-link-icon">
                  <MessageSquare size={24} />
                </div>
                <h3 className="quick-link-title">Team Chat</h3>
                <p className="quick-link-desc">Connect and collaborate with your team members in real-time.</p>
              </Link>
            )}

            {hasGames && (
              <Link href="/games/uno" className="quick-link-card">
                <div className="quick-link-icon">
                  <Gamepad2 size={24} />
                </div>
                <h3 className="quick-link-title">Play Games</h3>
                <p className="quick-link-desc">Take a break and join an active game session.</p>
              </Link>
            )}

            {hasAdmin && (
              <Link href="/admin/users" className="quick-link-card">
                <div className="quick-link-icon">
                  <Shield size={24} />
                </div>
                <h3 className="quick-link-title">Admin Portal</h3>
                <p className="quick-link-desc">Manage users, roles, and system workflows.</p>
              </Link>
            )}

            <Link href="/settings" className="quick-link-card">
              <div className="quick-link-icon">
                <Settings size={24} />
              </div>
              <h3 className="quick-link-title">Settings</h3>
              <p className="quick-link-desc">Update your profile, theme, and language preferences.</p>
            </Link>

          </div>
        </div>

        {/* Right Column: Account Overview */}
        <div>
          <h2 className="dashboard-section-title">Account Overview</h2>
          <div className="dashboard-overview-card">
            
            <div className="overview-item">
              <span className="overview-label">Status</span>
              <div className="status-badge">
                <span className="status-dot"></span>
                {user?.status ? user.status : t('dashboard.active', 'Active')}
              </div>
            </div>

            <div className="overview-item">
              <span className="overview-label">Email</span>
              <span className="overview-value" title={user?.email}>{user?.email || 'N/A'}</span>
            </div>

            <div className="overview-item">
              <span className="overview-label">Roles</span>
              <span className="overview-value">
                {user?.roles?.length ? `${user.roles.length} Active Role(s)` : 'User'}
              </span>
            </div>
            
            <div className="overview-item" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)', justifyContent: 'center' }}>
              <span className="overview-label" style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                System Operations Normal
              </span>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardFeature;
