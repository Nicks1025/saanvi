import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { User, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import healthService from '../../features/admin/health/healthService';
import './layout.css';

const AppHeader = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [healthStatus, setHealthStatus] = useState(() => {
    return sessionStorage.getItem('app_health_status') || 'loading';
  });

  useEffect(() => {
    const fetchHealth = async () => {
      // Only fetch if we haven't checked health in this session yet
      if (!sessionStorage.getItem('app_health_status')) {
        try {
          const res = await healthService.getSystemHealth();
          if (res.success && res.data) {
            setHealthStatus(res.data.status);
            sessionStorage.setItem('app_health_status', res.data.status);
          } else {
            setHealthStatus('down');
            sessionStorage.setItem('app_health_status', 'down');
          }
        } catch (e) {
          setHealthStatus('down');
          sessionStorage.setItem('app_health_status', 'down');
        }
      }
    };
    fetchHealth();
  }, []);

  const getStatusColor = () => {
    if (healthStatus === 'healthy') return '#2ecc71';
    if (healthStatus === 'degraded') return '#f39c12';
    if (healthStatus === 'down') return '#e74c3c';
    return '#95a5a6';
  };

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
        <div 
          title={`System Status: ${healthStatus}`}
          style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: getStatusColor(),
            boxShadow: `0 0 8px ${getStatusColor()}`,
            marginRight: '0.5rem'
          }} 
        />
        
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
      </div>
    </header>
  );
};

export default AppHeader;
