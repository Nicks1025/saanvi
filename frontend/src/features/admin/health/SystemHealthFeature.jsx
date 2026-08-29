import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import SButton from '../../../components/common/SButton';
import './SystemHealthFeature.css';
import { toast } from 'react-hot-toast';
import healthService from './healthService';

// Initialize when the app loads, persist across page reloads in the same session
let appStartTime = sessionStorage.getItem('app_start_time');
if (!appStartTime) {
  appStartTime = Date.now();
  sessionStorage.setItem('app_start_time', appStartTime.toString());
} else {
  appStartTime = parseInt(appStartTime, 10);
}

const SystemHealthFeature = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [frontendUptime, setFrontendUptime] = useState('0s');

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - appStartTime) / 1000);
      const d = Math.floor(elapsed / (3600 * 24));
      const h = Math.floor((elapsed % (3600 * 24)) / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = Math.floor(elapsed % 60);
      setFrontendUptime(`${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await healthService.getSystemHealth();
      if (response.success) {
        setHealthData(response.data);
      } else {
        toast.error(response.error || 'Failed to fetch system health');
      }
    } catch (err) {
      toast.error('Network error while fetching system health');
    } finally {
      setLoading(false);
    }
  };

  const fetchedRef = React.useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchHealth();
    }
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      healthy: { label: 'Healthy', className: 'status-healthy' },
      degraded: { label: 'Degraded', className: 'status-degraded' },
      down: { label: 'Down', className: 'status-down' }
    };
    const config = statusMap[status] || statusMap.down;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const serviceNames = {
    backendUptime: 'Backend API',
    supabaseDatabase: 'Supabase Database',
    supabaseStorage: 'Supabase Storage',
    redis: 'Redis Cache',
    socketIo: 'Socket.IO (Realtime)'
  };

  return (
    <div className="system-health-container page-container">
      <div className="health-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2 style={{ margin: 0 }}>System Health</h2>
          <SButton size="m" color="primary" onClick={fetchHealth} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className={loading ? 'spinning-icon' : ''} />
            <span className="health-refresh-text">{loading ? 'Refreshing...' : 'Refresh'}</span>
          </SButton>
        </div>

        {healthData && (
          <p className="health-subtitle">
            Overall Status: {getStatusBadge(healthData.status)}
            <span className="health-time">
              Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
            </span>
          </p>
        )}
      </div>

      {loading && !healthData ? (
        <div className="health-loading">Loading system status...</div>
      ) : healthData ? (
        <div className="health-grid">
          
          <div className="health-card">
            <div className="health-card-header">
              <h3 className="health-card-title">Frontend SPA</h3>
              {getStatusBadge('healthy')}
            </div>
            <div className="health-card-body">
              <div className="health-message">
                Uptime: {frontendUptime}
              </div>
            </div>
          </div>

            {Object.entries(healthData.services).map(([key, service]) => {
              let parsedMessage = null;
              if (service.message) {
                try {
                  parsedMessage = JSON.parse(service.message);
                } catch (e) {
                  // Not JSON, ignore
                }
              }

              return (
                <div key={key} className="health-card">
                  <div className="health-card-header">
                    <h3 className="health-card-title">{serviceNames[key] || key}</h3>
                    {getStatusBadge(service.status)}
                  </div>
                  <div className="health-card-body">
                    {service.responseTime !== undefined && (
                      <div className="health-metric">
                        <span className="metric-label">Ping:</span>
                        <span className="metric-value">{service.responseTime} ms</span>
                      </div>
                    )}
                  {parsedMessage ? (
                    <div className="health-message" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      <div className="health-metric">
                        <span className="metric-label">Storage:</span>
                        <span className="metric-value">{parsedMessage.used_mb} MB / 10 GB </span>
                      </div>
                      <div className="health-metric">
                        <span className="metric-label">Class A Ops:</span>
                        <span className="metric-value">{parsedMessage.class_a.toLocaleString()} / 1M </span>
                      </div>
                      <div className="health-metric">
                        <span className="metric-label">Class B Ops:</span>
                        <span className="metric-value">{parsedMessage.class_b.toLocaleString()} / 10M </span>
                      </div>
                    </div>
                  ) : service.message ? (
                    <div className="health-message">
                      {key === 'backendUptime' ? `Uptime: ${service.message}` : service.message}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="health-error">Failed to load system health.</div>
      )}
    </div>
  );
};

export default SystemHealthFeature;
