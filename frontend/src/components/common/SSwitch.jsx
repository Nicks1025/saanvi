import React from 'react';
import STooltip from './STooltip';
import './s-switch.css';

const SSwitch = ({
  label,
  description,
  tooltip,
  checked = false,
  onChange,
  disabled = false,
  error = '',
  className = '',
  id = Math.random().toString(36).substring(7)
}) => {
  const isChecked = checked === true || checked === 'true';

  const handleClick = () => {
    if (disabled) return;
    if (onChange) {
      onChange(!isChecked);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={`s-switch-container ${className}`.trim()}>
      <div 
        className={`s-switch-wrapper ${disabled ? 'disabled' : ''}`.trim()}
        onClick={handleClick}
        role="switch"
        aria-checked={isChecked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        <div className="s-switch-label-group">
          {label && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor={id} className="s-switch-label">{label}</label>
              {tooltip && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <STooltip content={tooltip} iconSize={15} />
                </div>
              )}
            </div>
          )}
          {description && <span className="s-switch-description">{description}</span>}
        </div>

        <div className={`s-switch-track ${isChecked ? 'checked' : ''}`.trim()}>
          <div className="s-switch-thumb" />
          <input
            id={id}
            type="checkbox"
            className="s-switch-input"
            checked={isChecked}
            disabled={disabled}
            onChange={() => {}} // Controlled by wrapper click
          />
        </div>
      </div>
      {error && <div className="s-switch-error">{error}</div>}
    </div>
  );
};

export default SSwitch;
