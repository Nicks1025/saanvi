import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import './s-alert.css';

const ALERT_CONFIG = {
  error: {
    icon: AlertCircle,
    className: 's-alert-error'
  },
  warning: {
    icon: AlertTriangle,
    className: 's-alert-warning'
  },
  info: {
    icon: Info,
    className: 's-alert-info'
  },
  success: {
    icon: CheckCircle2,
    className: 's-alert-success'
  }
};

const SAlert = ({
  type = 'info',
  text = '',
  children = null,
  icon: CustomIcon = null,
  iconSize = 20,
  className = '',
  style = {},
  ...props
}) => {
  const normalizedType = String(type).toLowerCase();
  const config = ALERT_CONFIG[normalizedType] || ALERT_CONFIG.info;
  const IconComponent = CustomIcon || config.icon;
  const content = text || children;

  return (
    <div
      role="alert"
      className={`s-alert ${config.className} ${className}`.trim()}
      style={style}
      {...props}
    >
      {IconComponent && (
        <span className="s-alert-icon-wrapper">
          <IconComponent size={iconSize} />
        </span>
      )}
      <div className="s-alert-text">
        {content}
      </div>
    </div>
  );
};

export default SAlert;
