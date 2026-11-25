import React from 'react';
import SIcon from './SIcon';

const SButton = ({ size = 'm', color = 'primary', text, label, children, icon, className = '', loading = false, disabled, ...props }) => {
  const sizeClass = `btn-${size}`; // e.g., btn-xs, btn-s, btn-m, btn-xl
  const colorClass = `btn-${color}`;

  const renderContent = () => {
    const content = children || text || label;
    if (icon && content) {
      return <span className="sdt-action-text">{content}</span>;
    }
    return content;
  };

  const renderIcon = () => {
    if (!icon) return null;
    const hasText = Boolean(children || text || label);
    return (
      <span className="s-button-icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: hasText ? '0.5rem' : '0' }}>
        <SIcon icon={icon} size={size} />
      </span>
    );
  };

  return (
    <button 
      className={`s-button ${sizeClass} ${colorClass} ${className}`.trim()} 
      aria-label={label || text || 'button'} 
      disabled={disabled || loading}
      {...props}
    >
      {renderIcon()}
      {renderContent()}
    </button>
  );
};

export default SButton;
