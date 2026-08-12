import React from 'react';

const SButton = ({ size = 'm', color = 'primary', text, label, children, icon, ...props }) => {
  const sizeClass = `btn-${size}`; // e.g., btn-xs, btn-s, btn-m, btn-xl
  const colorClass = `btn-${color}`;

  return (
    <button className={`s-button ${sizeClass} ${colorClass}`} aria-label={label || text || 'button'} {...props}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: (children || text || label) ? '0.5rem' : '0' }}>{icon}</span>}
      {children || text || label}
    </button>
  );
};

export default SButton;
