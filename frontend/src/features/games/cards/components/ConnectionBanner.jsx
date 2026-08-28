import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ConnectionBanner = ({ status = 'connected', roomCode = 'X7K29', message = null }) => {
  if (status === 'connected' && !message) return null;

  return (
    <div className={`connection-banner-container status-${status} animate-fadeIn`}>
      <div className="connection-banner-content">
        {status === 'reconnecting' && (
          <>
            <RefreshCw size={16} className="spin-cw text-amber-400" />
            <span>Reconnecting to room <strong>{roomCode}</strong>... Standby</span>
          </>
        )}

        {status === 'connecting' && (
          <>
            <Wifi size={16} className="animate-pulse text-blue-400" />
            <span>Connecting to game server...</span>
          </>
        )}

        {status === 'disconnected' && (
          <>
            <WifiOff size={16} className="text-red-400" />
            <span>Connection lost. Attempting auto-reconnect...</span>
          </>
        )}

        {status === 'connected' && message && (
          <>
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{message}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionBanner;
