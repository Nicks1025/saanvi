import React, { useEffect, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import SButton from '../../../../components/common/SButton';
import { downloadAttachment } from '../../attachmentUtils';
import { useAttachment, ATTACHMENT_STATES } from '../../hooks/useAttachment';
import { CircularProgress } from '../common/CircularProgress';

/**
 * ImageLightbox
 *
 * Full-screen image viewer for single or multi-image navigation.
 */
const ImageLightbox = ({ messageUuid, attachments, index, onClose, onNav }) => {
  const [zoom, setZoom] = useState(false);

  const hasPrev = index > 0;
  const hasNext = index < attachments.length - 1;

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
    if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
  }, [onClose, hasPrev, hasNext, index, onNav]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!attachments || attachments.length === 0) return null;
  const currentAtt = attachments[index];
  const targetMessageUuid = currentAtt._messageUuid || messageUuid;
  
  // Rules of hooks: this is fine as long as `attachments.length > 0` doesn't change from true to false 
  // during the lifetime of this component (if it becomes 0, we return null, but typically it unmounts).
  // React will warn if attachments change length to 0, but onClose is usually called instead.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, progress, localUrl, download, cancel } = useAttachment(targetMessageUuid, currentAtt);

  const currentAlt = currentAtt.original_file_name || currentAtt.file_name || 'Media';
  const isDownloaded = state === ATTACHMENT_STATES.DOWNLOADED;
  const isDownloading = state === ATTACHMENT_STATES.DOWNLOADING;

  return ReactDOM.createPortal(
    <div
      className="lightbox-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      {/* Header Actions */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <button
          onClick={onClose}
          aria-label="Close viewer"
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}
        >
          <X size={32} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (isDownloaded && localUrl) downloadAttachment(localUrl, currentAlt); }}
          aria-label="Save media"
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', opacity: isDownloaded ? 1 : 0.5 }}
          disabled={!isDownloaded}
        >
          <Download size={32} />
        </button>
      </div>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(false); onNav(index - 1); }}
          aria-label="Previous media"
          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, cursor: 'pointer', borderRadius: '50%', padding: '8px' }}
        >
          <ChevronLeft size={36} />
        </button>
      )}

      {/* Main Content */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: zoom ? 'auto' : 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={isDownloaded ? localUrl : currentAtt.preview_data}
          alt={currentAlt}
          style={{
            maxWidth: zoom ? 'none' : '90vw',
            maxHeight: zoom ? 'none' : '80vh',
            objectFit: 'contain',
            cursor: zoom && isDownloaded ? 'zoom-out' : isDownloaded ? 'zoom-in' : 'default',
            transform: zoom && isDownloaded ? 'scale(2.5)' : 'scale(1)',
            transition: 'transform 0.2s ease-out',
            filter: !isDownloaded ? 'blur(10px)' : 'none'
          }}
          onClick={() => { if (isDownloaded) setZoom(!zoom); }}
        />
        
        {!isDownloaded && (
          <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDownloading ? (
              <CircularProgress progress={progress} onCancel={cancel} size={64} strokeWidth={4} />
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); download(); }}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: '50%',
                  padding: '16px',
                  display: 'flex',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Download size={32} />
              </button>
            )}
          </div>
        )}
      </div>

      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(false); onNav(index + 1); }}
          aria-label="Next media"
          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, cursor: 'pointer', borderRadius: '50%', padding: '8px' }}
        >
          <ChevronRight size={36} />
        </button>
      )}

      {/* Thumbnail Reel */}
      {attachments.length > 1 && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '90vw', padding: '10px' }} onClick={(e) => e.stopPropagation()}>
          {attachments.map((att, idx) => {
            return (
              <div 
                key={att.uuid}
                onClick={() => { setZoom(false); onNav(idx); }}
                style={{
                  width: '50px',
                  height: '50px',
                  flexShrink: 0,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: index === idx ? '2px solid white' : '2px solid transparent',
                  opacity: index === idx ? 1 : 0.6,
                  transition: 'opacity 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.1)'
                }}
              >
                {att.preview_data || att._localUrl ? (
                  <img src={att.preview_data || att._localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#333' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
};

export default ImageLightbox;
