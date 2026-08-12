import React from 'react';
import { ChevronDown } from 'lucide-react';
import './s-dropdown.css';

const SDropdown = ({ label, value, options = [], onChange, width = '100%' }) => {
  return (
    <div className="s-dropdown-container" style={{ width }}>
      {label && <label className="s-dropdown-label">{label}</label>}
      <div className="s-dropdown-wrapper">
        <select 
          className="s-dropdown-select" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="s-dropdown-icon">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
};

export default SDropdown;
