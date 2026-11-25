import React from 'react';
import { useTranslation } from 'react-i18next';
import SButton from '@/components/common/SButton';
import SIcon from '@/components/common/SIcon';

const MAX_IMAGES = parseInt(process.env.NEXT_PUBLIC_CHAT_MAX_IMAGES, 10) || 5;

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
            ? t('admin.chat.imagesSelected_plural', { count: images.length })
            : t('admin.chat.imagesSelected', { count: images.length })}
        </span>
        <SIcon
          name="x"
          size={18}
          className="img-preview-strip-cancel"
          onClick={onCancel}
          disabled={sending}
          title={t('admin.chat.cancelSelection')}
          aria-label={t('admin.chat.cancelSelection')}
        />
      </div>

      <div className="img-preview-strip-thumbs">
        {images.map((img, idx) => {
          return (
            <div key={img.previewUrl} className="img-preview-thumb">
              <img src={img.previewUrl} alt={img.file.name} className="img-preview-thumb-img" />
              <SIcon
                name="x"
                size={12}
                className="img-preview-thumb-remove"
                onClick={() => {
                  onRemove(idx);
                }}
                disabled={isBusy}
                title={t('admin.chat.removeImage', { name: img.file.name })}
                aria-label={t('admin.chat.removeImage', { name: img.file.name })}
              />
            </div>
          );
        })}

        {canAddMore && !isBusy && (
          <SIcon
            name="image-plus"
            size={22}
            className="img-preview-add-more"
            onClick={onAddMore}
            aria-label={t('admin.chat.addMoreImages')}
            title={t('admin.chat.addMoreTitle', { max: MAX_IMAGES })}
          />
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
            aria-label={images.length > 1 ? t('admin.chat.sendImages_plural', { count: images.length }) : t('admin.chat.sendImages')}
            color="primary"
          >
            {images.length > 1 ? t('admin.chat.sendImages_plural', { count: images.length }) : t('admin.chat.sendImages')}
          </SButton>
        </div>
      )}

      {children}
    </div>
  );
};

export default ImagePreviewStrip;
