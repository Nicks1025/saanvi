import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Download } from 'lucide-react';
import SButton from '../../../../components/common/SButton';
import { downloadAttachment } from '../../attachmentUtils';
import { useAttachment, ATTACHMENT_STATES } from '../../hooks/useAttachment';
import { CircularProgress } from '../common/CircularProgress';

/**
 * AudioMessage
 *
 * Renders a music/audio file attachment with a player UI that is visually
 * distinct from VoiceMessage (uses a music icon instead of mic avatar).
 */
const AudioMessage = ({ messageUuid, attachment, isSender }) => {
  const { state, progress: downloadProgress, localUrl, download, cancel } = useAttachment(messageUuid, attachment);

  const isDownloaded = state === ATTACHMENT_STATES.DOWNLOADED;
  const isDownloading = state === ATTACHMENT_STATES.DOWNLOADING;

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  const fmt = (secs) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!isDownloaded) {
      download();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
      audio.play().catch(() => {});
    }
  };

  const handleScrub = (e) => {
    if (!isDownloaded) return;
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const displayName = attachment.original_file_name || attachment.file_name || 'Audio';

  return (
    <div className="msg-audio-content">
      {isDownloaded && localUrl && (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        ref={audioRef}
        src={localUrl}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => {
          const d = e.target.duration || 0;
          const c = e.target.currentTime;
          setCurrentTime(c);
          setProgress(d ? c / d : 0);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
      />
      )}
      <div className="msg-audio-layout">
        <div className="msg-audio-icon">
          <Music size={20} />
        </div>
        <div className="msg-audio-info">
          <span className="msg-audio-name">{displayName}</span>
          <div className="msg-audio-controls" style={{ opacity: isDownloaded ? 1 : 0.5 }}>
            
            {isDownloading ? (
              <div style={{ marginRight: '8px' }}>
                <CircularProgress progress={downloadProgress} onCancel={cancel} size={28} strokeWidth={2} />
              </div>
            ) : (
              <SButton
                className="msg-audio-playbtn"
                onClick={handlePlayPause}
                aria-label={!isDownloaded ? 'Download audio' : playing ? 'Pause audio' : 'Play audio'}
                color="ghost"
                size="small"
                style={{ padding: '6px', minWidth: 'unset', color: 'var(--primary-color)' }}
              >
                {!isDownloaded ? <Download size={16} /> : playing ? <Pause size={16} /> : <Play size={16} />}
              </SButton>
            )}

            <div
              className="msg-audio-bar"
              onClick={handleScrub}
              role="slider"
              aria-label="Audio progress"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              style={{ cursor: isDownloaded ? 'pointer' : 'default' }}
            >
              <div className="msg-audio-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="msg-audio-time">
              {playing || currentTime > 0 ? fmt(currentTime) : (duration ? fmt(duration) : '--:--')}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SButton
            onClick={() => {
              if (isDownloaded && localUrl) {
                downloadAttachment(localUrl, displayName);
              }
            }}
            aria-label="Download audio file"
            color="ghost"
            size="small"
            style={{ padding: '4px', minWidth: 'unset', color: 'inherit', opacity: isDownloaded ? 0.7 : 0.3 }}
            disabled={!isDownloaded}
          >
            <Download size={18} />
          </SButton>
        </div>
      </div>
    </div>
  );
};

export default AudioMessage;
