import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './s-text-field.css';

const STextField = ({ type = 'text', text = '', label, placeholder, width = '100%', marginBottom = '1rem', onChange, required = false, error = '' }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const currentType = isPasswordType && showPassword ? 'text' : type;

  return (
    <div className="s-text-field" style={{ width, marginBottom }}>
      {label && (
        <label>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div className={`s-text-field-input-wrapper ${error ? 'has-error' : ''}`}>
        <input 
          type={currentType} 
          value={text} 
          placeholder={placeholder} 
          onChange={onChange} 
          className="s-input"
          style={{ 
            paddingRight: isPasswordType ? '2.5rem' : '0.8rem',
            borderColor: error ? '#ef4444' : undefined
          }}
        />
        {isPasswordType && (
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            className="s-text-field-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default STextField;
