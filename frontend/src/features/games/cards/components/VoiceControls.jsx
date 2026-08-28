import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export const VoiceControls = ({
  isMuted = false,
  isDeafened = false,
  onToggleMute,
  onToggleDeafen,
}) => {
  return (
    <div className="bottom-left-voice-controls" id="voice-controls-panel">
      {/* Microphone Toggle Button */}
      <button
        className={`compact-voice-btn ${isMuted ? 'is-muted' : 'is-active'}`}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Speaker / Audio Toggle Button */}
      <button
        className={`compact-voice-btn ${isDeafened ? 'is-deafened' : 'is-active'}`}
        onClick={onToggleDeafen}
        title={isDeafened ? 'Turn Audio On' : 'Deafen Audio'}
        aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
      >
        {isDeafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
};

export default VoiceControls;
