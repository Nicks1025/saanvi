import React, { useState, useRef } from 'react';
import { Upload, X, User, Camera } from 'lucide-react';
import './s-image-upload.css';

const SImageUpload = ({
  value,
  onChange,
  onRemove,
  accept = 'image/jpeg, image/png, image/webp',
  maxSize = 5 * 1024 * 1024,
  disabled = false,
  error = null,
  label,
  className = ''
}) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);
  const [localError, setLocalError] = useState(null);

  React.useEffect(() => {
    // If the value passed from above changes (e.g., loaded from server)
    if (typeof value === 'string') {
      setPreview(value);
    } else if (!value) {
      setPreview(null);
    }
  }, [value]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setLocalError(null);

    if (!file) return;

    if (file.size > maxSize) {
      setLocalError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Generate preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    if (onChange) {
      onChange(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`s-image-upload-wrapper ${className}`}>
      {label && !preview && <label className="s-image-upload-label">{label}</label>}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div className={`s-image-upload-filled ${disabled ? 'disabled' : ''}`} onClick={handleClick}>
          <img src={preview} alt="" className="s-image-upload-img" />
          <div className="s-image-upload-edit-badge">
            <Camera size={16} color="white" />
          </div>
          {!disabled && (
            <button type="button" className="s-image-upload-remove" onClick={handleRemove}>
              <X size={14} color="white" />
            </button>
          )}
        </div>
      ) : (
        <div 
          className={`s-image-upload-container ${disabled ? 'disabled' : ''} ${error || localError ? 'has-error' : ''}`}
          onClick={handleClick}
        >
          <div className="s-image-upload-placeholder">
            <div className="s-image-upload-icon-circle">
              <User size={32} />
            </div>
            <span className="s-image-upload-text">Upload Photo</span>
          </div>
        </div>
      )}
      
      {(error || localError) && (
        <div className="s-image-upload-error">{error || localError}</div>
      )}
    </div>
  );
};

export default SImageUpload;
