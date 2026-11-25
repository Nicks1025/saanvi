import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import SButton from './SButton';
import './smodal.css';
import { useTranslation } from 'react-i18next';

const SModal = ({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmColor = 'primary',
  cancelColor = 'secondary',
  isProcessing = false,
  confirmDisabled = false,
  width,
  style,
  hideFooter = false,
  text
}) => {
  const { t } = useTranslation();
  const finalConfirmText = confirmText || t('common.confirm');
  const finalCancelText = cancelText || t('common.cancel');

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

  const modalContent = (
    <div className="s-modal-overlay">
      <div
        className="s-modal-content"
        style={{
          maxHeight: '90vh',
          ...(width ? { maxWidth: width, width: '100%' } : {}),
          ...style
        }}
      >
        {title && <h2 className="s-modal-title">{title}</h2>}
        <div className="s-modal-body">
          {text ? <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{text}</p> : children}
        </div>
        {!hideFooter && (onCancel || onConfirm) && (
          <div
            className="s-modal-actions"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0
            }}
          >
            {onCancel && (
              <SButton
                onClick={onCancel}
                color={cancelColor}
                text={finalCancelText}
                disabled={isProcessing}
              />
            )}
            {onConfirm && (
              <SButton
                onClick={onConfirm}
                color={confirmColor}
                text={finalConfirmText}
                disabled={isProcessing || confirmDisabled}
                icon={isProcessing ? <span className="s-spinner" /> : null}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default SModal;
