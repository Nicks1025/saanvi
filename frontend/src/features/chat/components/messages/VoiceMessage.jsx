import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Mic, Download } from 'lucide-react';
import SButton from '@/components/common/SButton';
import { downloadAttachment } from '../../attachmentUtils';
import { useAttachment, ATTACHMENT_STATES } from "../../hooks/useAttachment";
import { CircularProgress } from '../common/CircularProgress';

/**
 * VoiceMessage
 *
 * WhatsApp-inspired voice note: play/pause, waveform progress bar, duration.
 */
const VoiceMessage = ({ messageUuid, attachment, isSender }) => {
  const { state, progress, localUrl, download, cancel } = useAttachment(messageUuid, attachment);

  const isDownloaded = state === ATTACHMENT_STATES.DOWNLOADED;
  const isDownloading = state === ATTACHMENT_STATES.DOWNLOADING;

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(null);

  const audioRef = useRef(null);
  const reqAnimFrameRef = useRef(null);
  const fillRef = useRef(null);
  const barsRef = useRef(null);
  const currentTimerRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (reqAnimFrameRef.current) {
        cancelAnimationFrame(reqAnimFrameRef.current);
      }
    };
  }, []);

  const updateVisuals = useCallback((currentTime, totalDurationRaw, isPaused) => {
    const totalDuration = Number.isFinite(totalDurationRaw) ? totalDurationRaw : 0;
    const p = totalDuration ? currentTime / totalDuration : 0;

    if (fillRef.current) fillRef.current.style.width = `${p * 100}%`;

    if (currentTimerRef.current) {
      const isFinished = totalDuration > 0 && currentTime >= totalDuration - 0.1;
      const isBeginning = currentTime <= 0.1;

      if (!isPaused || isDraggingRef.current) {
        currentTimerRef.current.textContent = fmt(currentTime) || '00:00';
      } else {
        currentTimerRef.current.textContent = fmt(totalDurationRaw) || '--:--';
      }
    }
    if (barsRef.current) {
      const bars = barsRef.current.children;
      for (let i = 0; i < bars.length; i++) {
        if (i / bars.length <= p) bars[i].classList.add('msg-voice-bar--filled');
        else bars[i].classList.remove('msg-voice-bar--filled');
      }
    }
  }, []);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    updateVisuals(audio.currentTime, audio.duration, audio.paused);
    
    if (!audio.paused && !audio.ended && !isDraggingRef.current) {
      reqAnimFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [updateVisuals]);

  const fmt = (secs) => {
    if (!Number.isFinite(secs) || isNaN(secs)) return null;
    const s = Math.floor(secs);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    if (!isDownloaded) {
      download();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      document.querySelectorAll('audio.voice-audio').forEach(a => {
        if (a !== audio) a.pause();
      });
      audio.play().catch(() => {});
      reqAnimFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [playing, updateProgress, isDownloaded, download]);

  const handleScrub = useCallback((e) => {
    if (!isDownloaded) return;
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    updateVisuals(audio.currentTime, duration, audio.paused);
  }, [duration, updateVisuals, isDownloaded]);

  const handlePointerDown = (e) => {
    if (!isDownloaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    handleScrub(e);
  };

  const handlePointerMove = (e) => {
    if (isDraggingRef.current) {
      handleScrub(e);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDownloaded) return;
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (playing && audioRef.current && !audioRef.current.paused) {
      reqAnimFrameRef.current = requestAnimationFrame(updateProgress);
    }
    if (audioRef.current) {
      updateVisuals(audioRef.current.currentTime, duration, audioRef.current.paused);
    }
  };

  return (
    <div className="msg-voice-content">
      {isDownloaded && localUrl && (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        ref={audioRef}
        src={localUrl}
        className="voice-audio"
        preload="metadata"
        onLoadedMetadata={(e) => {
          const audio = e.target;
          if (audio.duration === Infinity) {
            audio.currentTime = 1e101;
            audio.addEventListener('timeupdate', function getDuration() {
              audio.removeEventListener('timeupdate', getDuration);
              audio.currentTime = 0;
              setDuration(audio.duration);
              updateVisuals(0, audio.duration, true);
            });
          } else {
            setDuration(audio.duration);
            updateVisuals(audio.currentTime, audio.duration, audio.paused);
          }
        }}
        onPlay={() => { setPlaying(true); reqAnimFrameRef.current = requestAnimationFrame(updateProgress); }}
        onPause={() => { setPlaying(false); cancelAnimationFrame(reqAnimFrameRef.current); updateVisuals(audioRef.current?.currentTime || 0, duration, true); }}
        onEnded={() => { setPlaying(false); updateVisuals(duration, duration, true); }}
      />
      )}
      <div className="msg-voice-layout">
        <div
          className="msg-voice-avatar"
          onClick={() => {
            if (isDownloaded && localUrl) {
              downloadAttachment(localUrl, attachment.original_file_name || 'voice-message.webm');
            }
          }}
          title={isDownloaded ? "Download voice message" : ""}
          style={{ cursor: isDownloaded ? 'pointer' : 'default', opacity: isDownloaded ? 1 : 0.5 }}
        >
          <Mic size={16} />
        </div>

        {isDownloading ? (
          <div style={{ marginLeft: 8, marginRight: 8 }}>
            <CircularProgress progress={progress} onCancel={cancel} size={32} strokeWidth={3} />
          </div>
        ) : (
          <SButton
            className="msg-voice-playbtn"
            onClick={handlePlayPause}
            aria-label={!isDownloaded ? 'Download voice message' : playing ? 'Pause voice message' : 'Play voice message'}
            color="ghost"
            size="small"
            className="p-2 min-w-unset text-inherit"
          >
            {!isDownloaded ? <Download size={18} /> : playing ? <Pause size={18} /> : <Play size={18} />}
          </SButton>
        )}

        <div className="msg-voice-track-area" style={{ opacity: isDownloaded ? 1 : 0.5 }}>
          <div
            className="msg-voice-progress-bar"
            role="slider"
            aria-label="Voice message progress"
            aria-valuenow={Math.round((audioRef.current?.currentTime / duration || 0) * 100) || 0}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ margin: 0, display: 'flex', alignItems: 'center', touchAction: 'none' }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5); }
              if (e.key === 'ArrowLeft')  { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5); }
            }}
          >
            <div className="msg-voice-track" style={{ width: '100%' }}>
              <div ref={fillRef} className="msg-voice-fill" style={{ width: '0%' }} />
              <div ref={barsRef} className="msg-voice-bars" aria-hidden="true">
                {Array.from({ length: 30 }).map((_, i) => {
                  const seed = (attachment.uuid?.charCodeAt(i % attachment.uuid.length) || 5) % 10;
                  const h = 30 + (seed * 7) % 70;
                  return (
                    <span
                      key={i}
                      className="msg-voice-bar"
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <span ref={currentTimerRef} className="msg-voice-duration" style={{ fontSize: '0.68rem', opacity: 0.75, fontVariantNumeric: 'tabular-nums', minWidth: '35px', textAlign: 'right' }}>
          --:--
        </span>
      </div>
    </div>
  );
};

export default VoiceMessage;
