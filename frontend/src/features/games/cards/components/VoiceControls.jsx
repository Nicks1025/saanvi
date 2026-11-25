import React from 'react';
import SIcon from '@/components/common/SIcon';

export const VoiceControls = ({
  isMuted = false,
  isDeafened = false,
  onToggleMute,
  onToggleDeafen,
}) => {
  return (
    <div className="bottom-left-voice-controls" id="voice-controls-panel">
      {/* Microphone Toggle Button */}
      <SIcon
        name={isMuted ? 'mic-off' : 'mic'}
        size={16}
        className={`compact-voice-btn ${isMuted ? 'is-muted' : 'is-active'}`}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      />

      {/* Speaker / Audio Toggle Button */}
      <SIcon
        name={isDeafened ? 'volume-x' : 'volume-2'}
        size={16}
        className={`compact-voice-btn ${isDeafened ? 'is-deafened' : 'is-active'}`}
        onClick={onToggleDeafen}
        title={isDeafened ? 'Turn Audio On' : 'Deafen Audio'}
        aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
      />
    </div>
  );
};

export default VoiceControls;
