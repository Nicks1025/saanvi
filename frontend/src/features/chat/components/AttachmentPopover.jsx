import React, { useRef, useEffect } from 'react';
import SButton from '@/components/common/SButton';
import { ATTACHMENT_CATEGORIES } from '../attachmentTypes';

const MAX_IMAGES = parseInt(process.env.NEXT_PUBLIC_CHAT_MAX_IMAGES, 10) || 5;

/**
 * AttachmentPopover
 *
 * A small tooltip/popover anchored to the attachment button.
 * Does NOT use a full-screen overlay.
 * Closes on outside click, Escape key, or when an option is selected.
 *
 * For the images category:
 *  - multiple file selection is allowed (up to MAX_IMAGES images)
 *  - onFilesSelected(files, categoryKey) is called with an array for images
 *  - onFileSelected(file, categoryKey) is still called for non-image files
 *
 * Props:
 *  isOpen          {boolean}
 *  onClose         {Function}
 *  onFileSelected  {Function(file, categoryKey)}      – single file (audio/doc)
 *  onFilesSelected {Function(files[], categoryKey)}   – multiple images
 *  anchorRef       {React.Ref}
 */
const AttachmentPopover = ({ isOpen, onClose, onFileSelected, onFilesSelected, anchorRef }) => {
  const popoverRef = useRef(null);
  const imageRef = useRef(null);
  const filesRef = useRef(null);
  const musicRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleOptionClick = (categoryKey) => {
    if (categoryKey === 'images') imageRef.current?.click();
    else if (categoryKey === 'files') filesRef.current?.click();
    else if (categoryKey === 'music') musicRef.current?.click();
  };

  /** Handle image file selection */
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;

    if (files.length > 0) {
      if (files.length > MAX_IMAGES) {
        // Validation: reject selection > MAX_IMAGES
        onFilesSelected?.(files, 'images');
      } else {
        onFilesSelected?.(files, 'images');
      }
    }

    onClose();
  };

  const handleSingleFileChange = (e, categoryKey) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelected?.(file, categoryKey);
      onClose();
    }
    e.target.value = '';
  };

  const options = [
    { key: 'images', ...ATTACHMENT_CATEGORIES.images },
    { key: 'files', ...ATTACHMENT_CATEGORIES.files },
    { key: 'music', ...ATTACHMENT_CATEGORIES.music },
  ];

  return (
    <>
      {/* Images — multiple for images */}
      <input
        type="file"
        ref={imageRef}
        style={{ display: 'none' }}
        accept={ATTACHMENT_CATEGORIES.images.accept}
        multiple
        onChange={handleImageChange}
        tabIndex={-1}
        aria-hidden="true"
      />
      {/* Files — single */}
      <input
        type="file"
        ref={filesRef}
        style={{ display: 'none' }}
        accept={ATTACHMENT_CATEGORIES.files.accept}
        onChange={(e) => handleSingleFileChange(e, 'files')}
        tabIndex={-1}
        aria-hidden="true"
      />
      {/* Music — single */}
      <input
        type="file"
        ref={musicRef}
        style={{ display: 'none' }}
        accept={ATTACHMENT_CATEGORIES.music.accept}
        onChange={(e) => handleSingleFileChange(e, 'music')}
        tabIndex={-1}
        aria-hidden="true"
      />

      {isOpen && (
        <div
          ref={popoverRef}
          className="attachment-popover"
          role="menu"
          aria-label="Attach file"
        >
          {options.map((option) => (
            <SButton
              key={option.key}
              color="ghost"
              size="m"
              className="attachment-popover-option"
              onClick={() => handleOptionClick(option.key)}
              label={`Upload ${option.label}`}
            >
              <span className={`attachment-popover-icon ${option.iconClass}`}>
                {option.icon}
              </span>
              <span className="attachment-popover-label">{option.label}</span>
            </SButton>
          ))}
        </div>
      )}
    </>
  );
};

export default AttachmentPopover;
