import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import SButton from '../../../components/common/SButton';
import { chatService } from '../chat.service';
import { toast } from 'react-hot-toast';

/**
 * WallpaperAdjuster (formerly InlineWallpaperCropper)
 * 
 * Modifies the CSS transform (translate and scale) of the wallpaper image 
 * without modifying the actual container size or re-uploading the image.
 */
const InlineWallpaperCropper = ({ wallpaperData, onClose, onSave }) => {
  const containerRef = useRef(null);

  // Active transform state
  const [tx, setTx] = useState(wallpaperData.transform?.tx || 0);
  const [ty, setTy] = useState(wallpaperData.transform?.ty || 0);
  const [sx, setSx] = useState(wallpaperData.transform?.sx || 1);
  const [sy, setSy] = useState(wallpaperData.transform?.sy || 1);

  // --- Interaction State ---
  const dragState = useRef(null); // { startX, startY, startTx, startTy }

  const handlePointerDown = useCallback((e) => {
    // Only drag with left mouse button / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: tx,
      startTy: ty
    };
  }, [tx, ty]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current) return;
    e.preventDefault();

    const { startX, startY, startTx, startTy } = dragState.current;

    // We don't need getBoundingClientRect here because delta X/Y in client pixels
    // maps exactly 1:1 to CSS pixels for translate().
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setTx(startTx + dx);
    setTy(startTy + dy);
  }, []);

  const handlePointerUp = useCallback((e) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // --- Wheel Zoom ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    // Proportional uniform zoom
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;

    setSx(prev => Math.max(0.1, prev * zoomFactor));
    setSy(prev => Math.max(0.1, prev * zoomFactor));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const handleZoomBtn = (factor) => {
    setSx(prev => Math.max(0.1, prev * factor));
    setSy(prev => Math.max(0.1, prev * factor));
  };

  const performSave = () => {
    // Pass the transform back to the parent to handle upload and persistence
    onSave({
      ...wallpaperData,
      transform: { tx, ty, sx, sy }
    });
  };

  return (
    <div className="chat-wallpaper-adjuster" ref={containerRef}>
      
      {/* The actual image being adjusted */}
      <img
        src={wallpaperData.url}
        alt="Adjusting"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`,
          cursor: dragState.current ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        draggable={false}
      />

      {/* Dim overlay removed to show exactly how it looks, or kept subtle if requested. 
          The user wanted to preview the EXACT final result, so no dim overlay needed during adjustment unless handles exist. */}

      {/* Controls */}
      <div className="chat-wallpaper-controls">
        <SButton
          color="ghost"
          size="s"
          icon={<ZoomOut size={18} />}
          onClick={() => handleZoomBtn(0.9)}
          label="Zoom out"
          title="Zoom out"
          className="chat-wallpaper-ctrl-btn"
        />
        <SButton
          color="ghost"
          size="s"
          icon={<ZoomIn size={18} />}
          onClick={() => handleZoomBtn(1.1)}
          label="Zoom in"
          title="Zoom in"
          className="chat-wallpaper-ctrl-btn"
        />
        <div className="chat-wallpaper-ctrl-divider" />
        <SButton
          color="ghost"
          size="s"
          icon={<X size={18} />}
          onClick={onClose}
          label="Cancel"
          title="Cancel"
          className="chat-wallpaper-ctrl-btn"
        />
        <SButton
          color="primary"
          size="s"
          icon={<Check size={16} />}
          text="Apply"
          onClick={performSave}
          className="chat-wallpaper-ctrl-btn chat-wallpaper-ctrl-save"
        />
      </div>

    </div>
  );
};

export default InlineWallpaperCropper;
