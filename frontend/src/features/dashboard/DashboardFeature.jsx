import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { useTranslation } from 'react-i18next';
import './dashboard.css';

const DashboardFeature = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-header">
        {t('dashboard.welcome', { name: user?.firstName || user?.displayName || user?.email?.split('@')[0] || 'User' })}
      </h1>
      <p className="dashboard-description">
        {t('dashboard.description')}
      </p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card-success">
          <h3 className="dashboard-card-title">{t('dashboard.accountStatus')}</h3>
          <p className="dashboard-card-value">
            {user?.status ? user.status : t('dashboard.active')}
          </p>
          <p className="dashboard-card-subtitle">{t('dashboard.systemsOperational')}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardFeature;
