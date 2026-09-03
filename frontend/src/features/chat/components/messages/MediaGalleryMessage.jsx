import React from 'react';
import { Download } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useAttachment, ATTACHMENT_STATES } from "../../hooks/useAttachment";
import { CircularProgress } from '../common/CircularProgress';

const GalleryItem = ({ messageUuid, attachment, onImageClick, index, className, isExtra, extraCount }) => {
  const [ref] = useIntersectionObserver({ triggerOnce: true, rootMargin: '200px' });
  const targetMessageUuid = attachment._messageUuid || messageUuid;
  const { state, progress, localUrl, download, cancel } = useAttachment(targetMessageUuid, attachment);

  const alt = attachment.original_file_name || attachment.file_name || 'Media';
  const isDownloaded = state === ATTACHMENT_STATES.DOWNLOADED;
  const isDownloading = state === ATTACHMENT_STATES.DOWNLOADING;

  const handleAction = (e) => {
    e.stopPropagation();
    if (isDownloaded) {
      onImageClick?.(index);
    } else if (state === ATTACHMENT_STATES.NOT_DOWNLOADED) {
      download();
    }
  };

  return (
    <button
      ref={ref}
      className={`msg-gallery-item ${className || ''}`}
      onClick={handleAction}
      aria-label={isDownloaded ? `View media: ${alt}` : `Download media: ${alt}`}
      type="button"
      style={{ position: 'relative' }}
    >
      <img
        src={isDownloaded ? localUrl : attachment.preview_data}
        alt={alt}
        className="msg-gallery-img"
        style={{ filter: !isDownloaded ? 'blur(10px)' : 'none' }}
        loading="lazy"
      />
      {isDownloaded && isExtra && (
        <div className="msg-gallery-overlay">
          <span>+{extraCount}</span>
        </div>
      )}
      
      {!isDownloaded && attachment._status !== 'uploading' && attachment._status !== 'failed' && (
        <div className="msg-gallery-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDownloading ? (
            <CircularProgress progress={progress} onCancel={cancel} size={36} strokeWidth={3} />
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px', display: 'flex', color: 'white' }}>
              <Download size={20} />
            </div>
          )}
        </div>
      )}

      {attachment._status === 'uploading' && (
        <div className="msg-gallery-overlay" style={{ flexDirection: 'column' }}>
          <span className="upload-spinner" />
          <span style={{ fontSize: '0.8rem', marginTop: '4px' }}>{attachment._progress}%</span>
        </div>
      )}
    </button>
  );
};

const MediaGalleryMessage = ({ messageUuid, attachments, caption, isSender, onImageClick }) => {
  const displayAttachments = attachments.slice(0, 4);
  const count = displayAttachments.length;

  const getGridClass = () => {
    if (count === 2) return 'msg-gallery--2';
    if (count === 3) return 'msg-gallery--3';
    if (count === 4) return 'msg-gallery--4';
    return 'msg-gallery--5';
  };

  return (
    <>
      <div className={`msg-gallery ${getGridClass()}`}>
        {displayAttachments.map((att, idx) => (
          <GalleryItem
            key={att.uuid || idx}
            messageUuid={messageUuid}
            attachment={att}
            onImageClick={onImageClick}
            index={idx}
            className={count === 3 && idx === 2 ? 'msg-gallery-item--wide' : ''}
            isExtra={idx === 3 && attachments.length > 4}
            extraCount={attachments.length - 4}
          />
        ))}
      </div>
      {caption && <p className="msg-text msg-image-caption">{caption}</p>}
    </>
  );
};

export default MediaGalleryMessage;
