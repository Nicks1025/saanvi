import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

const SDate = ({
  label,
  text,
  onChange,
  required = false,
  error = '',
  marginBottom = '1rem',
  placeholder = 'Select date'
}) => {
  // text comes from the backend as 'YYYY-MM-DD' or similar string. We need to convert it to a Date object.
  const selectedDate = text ? new Date(text) : null;

  const handleDateChange = (date) => {
    // Format back to YYYY-MM-DD to keep it compatible with our existing form state
    if (date) {
      // Avoid time zone offset issues by using local date
      const offset = date.getTimezoneOffset();
      date = new Date(date.getTime() - (offset * 60 * 1000));
      onChange({ target: { value: date.toISOString().split('T')[0] } });
    } else {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div style={{ marginBottom, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label style={{ marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-h, #333)' }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          placeholderText={placeholder}
          dateFormat="yyyy-MM-dd"
          className={`s-input ${error ? 'has-error' : ''}`}
          wrapperClassName="s-datepicker-wrapper"
          style={{ width: '100%' }}
          customInput={
            <input 
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                paddingRight: '2.5rem',
                backgroundColor: 'var(--bg, #ffffff)',
                border: `1px solid ${error ? '#ef4444' : 'var(--border, #e4e4e7)'}`,
                borderRadius: '8px',
                color: 'var(--text, #18181b)',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          }
        />
        <Calendar 
          size={18} 
          style={{ 
            position: 'absolute', 
            right: '0.75rem', 
            color: 'var(--text-muted, #71717a)',
            pointerEvents: 'none'
          }} 
        />
      </div>
      
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default SDate;
