import React from 'react';
import SModal from './SModal';
import { useTranslation } from 'react-i18next';

/**
 * Common Delete Confirmation Modal component.
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onConfirm - Handler called when user clicks confirm
 * @param {function} onCancel - Handler called when user cancels or closes modal
 * @param {string} [title] - Modal title. Default: "Delete Confirmation" (or derived from itemType)
 * @param {string|React.ReactNode} [text] - Confirmation text/body
 * @param {string} [itemName] - Name of item being deleted (e.g. "Welcome Email")
 * @param {string} [itemType] - Type of item being deleted (e.g. "Template", "Field", "Record")
 * @param {string} [confirmText] - Label for delete button. Default: "Delete"
 * @param {string} [cancelText] - Label for cancel button. Default: "Cancel"
 * @param {string} [confirmColor='danger'] - Color style for confirm button
 * @param {boolean} [isProcessing=false] - Loading spinner state
 * @param {React.ReactNode} [children] - Optional custom modal body content
 */
const SDeleteConfirmation = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  text,
  itemName,
  itemType,
  confirmText,
  cancelText,
  confirmColor = 'danger',
  cancelColor = 'secondary',
  isProcessing = false,
  confirmDisabled = false,
  width,
  children,
  ...props
}) => {
  const { t } = useTranslation();

  const resolvedTitle =
    title ||
    (itemType
      ? t('common.confirmationModal.deleteItemTitle', { itemType })
      : t('common.confirmationModal.deleteConfirmation'));

  let resolvedText = text;
  if (!resolvedText && !children) {
    if (itemName && itemType) {
      resolvedText = t(
        'common.confirmationModal.deleteTypedNamedConfirm', { itemType, itemName }
      );
    } else if (itemName) {
      resolvedText = t(
        'common.confirmationModal.deleteNamedConfirm', { itemName }
      );
    } else if (itemType) {
      resolvedText = t(
        'common.confirmationModal.deleteTypedConfirm', { itemType }
      );
    } else {
      resolvedText = t(
        'common.confirmationModal.deleteConfirm'
      );
    }
  }

  const finalConfirmText = confirmText || t('common.delete');
  const finalCancelText = cancelText || t('common.cancel');

  return (
    <SModal
      isOpen={isOpen}
      title={resolvedTitle}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText={finalConfirmText}
      cancelText={finalCancelText}
      confirmColor={confirmColor}
      cancelColor={cancelColor}
      isProcessing={isProcessing}
      confirmDisabled={confirmDisabled}
      width={width}
      text={!children ? resolvedText : undefined}
      {...props}
    >
      {children || null}
    </SModal>
  );
};

export default SDeleteConfirmation;
