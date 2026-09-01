import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import SButton from './SButton';

const SFileUpload = ({
  label,
  file,
  onChange,
  required = false,
  error = '',
  marginBottom = '1rem',
  accept = '*'
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onChange(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ marginBottom }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text)' }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <div style={{
        border: `1px dashed ${error ? '#ef4444' : 'var(--border)'}`,
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg)',
        gap: '1rem'
      }}>
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '4px',
              backgroundColor: 'var(--accent-bg, #f3e8ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0
            }}>
              <Upload size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.name || 'Selected File'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ready to upload
              </p>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No file chosen
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {file && (
            <SButton 
              type="button" 
              onClick={handleRemove} 
              style={{ background: '#ffebee', color: '#d32f2f', padding: '0.5rem' }}
              icon={<X size={16} />}
            />
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept={accept}
          />
          <SButton 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            color={file ? "default" : "primary"}
            text={file ? "Change" : "Browse"}
            style={{ padding: '0.5rem 1rem' }}
          />
        </div>
      </div>
      
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default SFileUpload;
