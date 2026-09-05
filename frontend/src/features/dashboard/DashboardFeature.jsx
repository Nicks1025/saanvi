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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 12) return t('dashboard.goodMorning', 'Good Morning');
    if (hour >= 12 && hour < 16) return t('dashboard.goodAfternoon', 'Good Afternoon');
    // Using Evening for after 4 PM to 2 AM
    return t('dashboard.goodEvening', 'Good Evening');
  };

  const userName = user?.firstName || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="dashboard-container page-container">

      <div>
        <h3 className="dashboard-header">
          {getGreeting()}, {userName}
        </h3>
        <p className="">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

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
  );
};

export default DashboardFeature;
