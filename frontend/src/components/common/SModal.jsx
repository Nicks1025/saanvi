import React, { useEffect } from 'react';
import './smodal.css';

const SModal = ({ isOpen, title, children, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isProcessing = false }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="s-modal-overlay">
      <div className="s-modal-content">
        {title && <h2 className="s-modal-title">{title}</h2>}
        <div className="s-modal-body">
          {children}
        </div>
        <div className="s-modal-actions">
          {onCancel && (
            <button className="s-button" onClick={onCancel} disabled={isProcessing}>
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button className="s-button btn-primary" onClick={onConfirm} disabled={isProcessing}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SModal;
