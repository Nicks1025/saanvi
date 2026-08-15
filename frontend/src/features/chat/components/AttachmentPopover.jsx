import React, { useRef, useEffect } from 'react';
import SButton from '../../../components/common/SButton';
import { ATTACHMENT_CATEGORIES } from '../attachmentTypes';

/**
 * AttachmentPopover
 *
 * A small tooltip/popover anchored to the attachment button.
 * Does NOT use a full-screen overlay.
 * Closes on outside click, Escape key, or when an option is selected.
 *
 * Props:
 *  isOpen         {boolean}   – whether the popover is visible
 *  onClose        {Function}  – close without selecting
 *  onFileSelected {Function}  – called with (File, categoryKey)
 *  anchorRef      {React.Ref} – ref to the button the popover is anchored to
 */
const AttachmentPopover = ({ isOpen, onClose, onFileSelected, anchorRef }) => {
  const popoverRef = useRef(null);
  const imageVideoRef = useRef(null);
  const filesRef = useRef(null);
  const musicRef = useRef(null);

  const inputRefs = {
    images_videos: imageVideoRef,
    files: filesRef,
    music: musicRef,
  };

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

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleOptionClick = (categoryKey) => {
    inputRefs[categoryKey]?.current?.click();
  };

  const handleFileChange = (e, categoryKey) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelected(file, categoryKey);
      onClose();
    }
    e.target.value = '';
  };

  const options = [
    { key: 'images_videos', ...ATTACHMENT_CATEGORIES.images_videos },
    { key: 'files', ...ATTACHMENT_CATEGORIES.files },
    { key: 'music', ...ATTACHMENT_CATEGORIES.music },
  ];

  // Always render the hidden inputs so refs are valid even when closed
  return (
    <>
      <input
        type="file"
        ref={imageVideoRef}
        style={{ display: 'none' }}
        accept={ATTACHMENT_CATEGORIES.images_videos.accept}
        onChange={(e) => handleFileChange(e, 'images_videos')}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        type="file"
        ref={filesRef}
        style={{ display: 'none' }}
        accept={ATTACHMENT_CATEGORIES.files.accept}
        onChange={(e) => handleFileChange(e, 'files')}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        type="file"
        ref={musicRef}
        style={{ display: 'none' }}
        accept={ATTACHMENT_CATEGORIES.music.accept}
        onChange={(e) => handleFileChange(e, 'music')}
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
