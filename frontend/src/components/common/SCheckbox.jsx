import React from 'react';
import Select from 'react-select';

const SCheckbox = ({
  label,
  checked = false,
  onChange,
  required = false,
  error = '',
  marginBottom = '1rem',
  options = [],
  value = [],
  multiple = false,
  id = Math.random().toString(36).substring(7)
}) => {

  if (options && options.length > 0) {
    // Map value strings back to react-select option objects
    const selectValue = Array.isArray(value) 
      ? options.filter(opt => value.includes(opt.value))
      : options.filter(opt => opt.value === value);

    const handleChange = (selected) => {
      if (multiple) {
        onChange(selected ? selected.map(s => s.value) : []);
      } else {
        onChange(selected ? selected.value : null);
      }
    };

    const customStyles = {
      control: (provided, state) => ({
        ...provided,
        padding: '0.2rem 0',
        borderRadius: '8px',
        borderColor: error ? '#ef4444' : state.isFocused ? 'var(--accent, #3b82f6)' : 'var(--border, #e4e4e7)',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
        '&:hover': {
          borderColor: error ? '#ef4444' : state.isFocused ? 'var(--accent, #3b82f6)' : 'var(--border, #e4e4e7)'
        }
      }),
      multiValue: (provided) => ({
        ...provided,
        backgroundColor: 'var(--accent-bg, rgba(170,59,255,0.08))',
        borderRadius: '4px'
      }),
      multiValueLabel: (provided) => ({
        ...provided,
        color: 'var(--accent)',
        fontWeight: 500
      })
    };

    return (
      <div style={{ marginBottom, display: 'flex', flexDirection: 'column' }}>
        {label && (
          <label style={{ marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-h, #333)' }}>
            {label}
            {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
          </label>
        )}
        <Select
          isMulti={multiple}
          options={options}
          value={selectValue}
          onChange={handleChange}
          styles={customStyles}
          classNamePrefix="react-select"
          placeholder="Select options..."
        />
        {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
      </div>
    );
  }

  // Fallback to original single boolean checkbox mode
  return (
    <div style={{ marginBottom }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input 
          type="checkbox" 
          id={id}
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
        />
        <label htmlFor={id} style={{ color: 'var(--text)', fontWeight: 500, cursor: 'pointer', margin: 0 }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default SCheckbox;

