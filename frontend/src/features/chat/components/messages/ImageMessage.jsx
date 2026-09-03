import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useAttachment, ATTACHMENT_STATES } from "../../hooks/useAttachment";
import { CircularProgress } from '../common/CircularProgress';

/**
 * ImageMessage
 *
 * Renders a single image attachment with lightbox support.
 */
const ImageMessage = ({ messageUuid, attachment, caption, isSender, onImageClick }) => {
  const [ref, isIntersecting] = useIntersectionObserver({ triggerOnce: true, rootMargin: '200px' });
  const { state, progress, localUrl, download, cancel } = useAttachment(messageUuid, attachment);

  const alt = attachment.original_file_name || attachment.file_name || 'Image';
  const isDownloaded = state === ATTACHMENT_STATES.DOWNLOADED;
  const isDownloading = state === ATTACHMENT_STATES.DOWNLOADING;

  const handleAction = (e) => {
    e.stopPropagation();
    if (isDownloaded) {
      onImageClick?.();
    } else if (state === ATTACHMENT_STATES.NOT_DOWNLOADED) {
      download();
    }
  };

  return (
    <div ref={ref} className="msg-image-content">
      <button
        className="msg-image-btn"
          onClick={handleAction}
          aria-label={isDownloaded ? `View image: ${alt}` : `Download image: ${alt}`}
          type="button"
          style={{ position: 'relative' }}
        >
          <img
            src={isDownloaded ? localUrl : attachment.preview_data}
            alt={alt}
            className="msg-image"
            style={{
              minHeight: '150px',
              aspectRatio: (attachment.width && attachment.height) ? `${attachment.width}/${attachment.height}` : 'auto',
              filter: !isDownloaded ? 'blur(10px)' : 'none'
            }}
            loading="lazy"
          />
          
          {!isDownloaded && (
             <div className="msg-gallery-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {isDownloading ? (
                 <CircularProgress progress={progress} onCancel={cancel} size={48} />
               ) : (
                 <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '12px', display: 'flex', color: 'white' }}>
                   <Download size={24} />
                 </div>
               )}
             </div>
          )}
        </button>
      {caption && <p className="msg-text msg-image-caption">{caption}</p>}
    </div>
  );
};

export default ImageMessage;
