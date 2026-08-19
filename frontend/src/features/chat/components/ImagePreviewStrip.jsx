import React, { useState, useRef, useEffect } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SButton from '../../../components/common/SButton';

const MAX_IMAGES = parseInt(import.meta.env.VITE_CHAT_MAX_IMAGES, 10) || 5;

/**
 * ImagePreviewStrip
 *
 * Shows selected images before sending.
 * Allows removing individual images and adding more (if under limit).
 *
 * Props:
 *  images        {Array<{file: File, previewUrl: string}>}
 *  onRemove      {(index: number) => void}
 *  onAddMore     {() => void}   – triggers file picker
 *  onSend        {() => void}
 *  onCancel      {() => void}
 *  sending       {boolean}
 *  uploadProgress {string|null}
 */
const ImagePreviewStrip = ({ images, onRemove, onAddMore, onSend, onCancel, sending, uploadProgress, children }) => {
  const { t } = useTranslation();
  const canAddMore = images.length < MAX_IMAGES;

  const handleInternalSend = async () => {
    onSend(images);
  };

  const isBusy = sending;

  return (
    <div className="img-preview-strip">
      <div className="img-preview-strip-header">
        <span className="img-preview-strip-count">
          {images.length !== 1 
            ? t('chat.imagesSelected_plural', { count: images.length }) 
            : t('chat.imagesSelected', { count: images.length })}
        </span>
        <button
          className="img-preview-strip-cancel"
          type="button"
          onClick={onCancel}
          disabled={sending}
          aria-label={t('chat.cancelSelection')}
        >
          <X size={18} />
        </button>
      </div>

      <div className="img-preview-strip-thumbs">
        {images.map((img, idx) => {
          return (
            <div key={img.previewUrl} className="img-preview-thumb">
              <img src={img.previewUrl} alt={img.file.name} className="img-preview-thumb-img" />
              <button
                className="img-preview-thumb-remove"
                type="button"
                onClick={() => {
                   onRemove(idx);
                }}
                disabled={isBusy}
                aria-label={t('chat.removeImage', { name: img.file.name })}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {canAddMore && !isBusy && (
          <button
            className="img-preview-add-more"
            type="button"
            onClick={onAddMore}
            aria-label={t('chat.addMoreImages')}
            title={t('chat.addMoreTitle', { max: MAX_IMAGES })}
          >
            <ImagePlus size={22} />
          </button>
        )}
      </div>



      {uploadProgress && (
        <div className="img-preview-progress" role="status" aria-live="polite">
          <span className="upload-spinner" aria-hidden="true" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {!isBusy && !uploadProgress && (
        <div className="img-preview-strip-actions">
          <SButton
            className="img-preview-send-btn"
            type="button"
            onClick={handleInternalSend}
            aria-label={images.length > 1 ? t('chat.sendImages_plural', { count: images.length }) : t('chat.sendImages')}
            color="primary"
          >
            {images.length > 1 ? t('chat.sendImages_plural', { count: images.length }) : t('chat.sendImages')}
          </SButton>
        </div>
      )}

      {children}
    </div>
  );
};

export default ImagePreviewStrip;
