import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const STextField = ({ type = 'text', text = '', label, placeholder, width = '100%', onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const currentType = isPasswordType && showPassword ? 'text' : type;

  return (
    <div className="s-text-field" style={{ width, display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
      {label && <label style={{ marginBottom: '0.25rem', fontWeight: 600 }}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input 
          type={currentType} 
          value={text} 
          placeholder={placeholder} 
          onChange={onChange} 
          className="s-input"
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            paddingRight: isPasswordType ? '2.5rem' : '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        {isPasswordType && (
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            style={{ 
              position: 'absolute', 
              right: '0.5rem', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default STextField;
