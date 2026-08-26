import React from 'react';
import SButton from './SButton';

const SForm = ({ 
  children, 
  onSubmit, 
  onCancel, 
  isValid = true, 
  loading = false, 
  saveText = 'Save', 
  cancelText = 'Cancel',
  className = ''
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid && !loading && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`s-form ${className}`.trim()}>
      <div className="s-form-content">
        {children}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem' }}>
        {onCancel && (
          <SButton onClick={onCancel} color="secondary" disabled={loading} type="button">
            {cancelText}
          </SButton>
        )}
        <SButton type="submit" color="primary" disabled={!isValid || loading}>
          {loading ? 'Saving...' : saveText}
        </SButton>
      </div>
    </form>
  );
};

export default SForm;
