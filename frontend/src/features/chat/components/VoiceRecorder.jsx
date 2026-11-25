import React, { useState, useRef, useEffect, useCallback } from 'react';
import SIcon from '@/components/common/SIcon';

/**
 * VoiceRecorder
 *
 * Manages MediaRecorder lifecycle for voice message recording.
 * Handles: start, pause, resume, cancel, and send.
 *
 * Props:
 *  onSend   {Function}  – called with (Blob, mimeType) when user sends the recording
 *  onCancel {Function}  – called when user cancels (no upload)
 */
const VoiceRecorder = ({ onSend, onCancel }) => {
  const [recordingState, setRecordingState] = useState('recording'); // 'recording' | 'paused'
  const [elapsed, setElapsed] = useState(0); // seconds

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Start timer
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start recording on mount
  useEffect(() => {
    let mounted = true;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        // Pick best supported MIME type
        const mimeType =
          MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : 'audio/mp4';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.start(250); // collect data every 250ms
        setRecordingState('recording');
        startTimer();
      } catch (err) {
        console.error('[VoiceRecorder] Failed to start recording:', err);
        onCancel();
      }
    };

    startRecording();

    return () => {
      mounted = false;
      stopTimer();
      // Stop the stream tracks on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePauseResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recordingState === 'recording') {
      recorder.pause();
      setRecordingState('paused');
      stopTimer();
    } else {
      recorder.resume();
      setRecordingState('recording');
      startTimer();
    }
  };

  const handleCancel = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    onCancel();
  };

  const handleSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    stopTimer();

    if (recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        onSend(blob, mimeType);
      };
      recorder.stop();
    }
  };

  // Format elapsed seconds as MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isPaused = recordingState === 'paused';

  return (
    <div className="voice-recorder">
      <SIcon
        name="close"
        size={18}
        onClick={handleCancel}
        title="Cancel recording"
        aria-label="Cancel recording"
        className="voice-recorder-btn danger"
      />

      <div className="voice-recorder-indicator">
        <span className={`voice-recorder-dot ${isPaused ? 'paused' : ''}`} aria-hidden="true" />
        <span className="voice-recorder-label">
          {isPaused ? 'Paused' : 'Recording...'}
        </span>
        <span className="voice-recorder-time">{formatTime(elapsed)}</span>
      </div>

      <SIcon
        name={isPaused ? 'play' : 'pause'}
        size={18}
        onClick={handlePauseResume}
        title={isPaused ? 'Resume recording' : 'Pause recording'}
        aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
        className="voice-recorder-btn"
      />

      <SIcon
        name="send"
        size={18}
        onClick={handleSend}
        title="Send voice message"
        aria-label="Send voice message"
        className="voice-recorder-send-btn"
      />
    </div>
  );
};

export default VoiceRecorder;
