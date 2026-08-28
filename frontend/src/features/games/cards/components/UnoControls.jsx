import React, { useEffect, useState } from 'react';
import { AlertCircle, Flame, ShieldCheck, Zap } from 'lucide-react';

export const UnoControls = ({
  showUnoCallButton = false,
  onCallUno,
  hasCalledUno = false,
  unoTimeLeft = 5,
  catchableOpponents = [],
  onCatchOpponentUno,
}) => {
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    if (showUnoCallButton) {
      setPulsing(true);
    }
  }, [showUnoCallButton]);

  return (
    <div className="uno-controls-layer" id="uno-controls-layer">
      {/* Floating Call UNO Button for Local Player */}
      {showUnoCallButton && !hasCalledUno && (
        <div className="call-uno-action-container animate-scaleUp">
          <div className="call-uno-glow-halo" />
          <button
            className="call-uno-massive-btn animate-bounce"
            onClick={onCallUno}
            title="Call UNO! Protect yourself from penalty"
          >
            <div className="btn-inner-content">
              <Zap size={22} className="uno-zap-icon" />
              <span className="uno-text-call">CALL UNO!</span>
              <span className="uno-sub-timer">{unoTimeLeft}s window</span>
            </div>
          </button>
        </div>
      )}

      {/* UNO Called Safe Banner */}
      {hasCalledUno && (
        <div className="uno-safe-toast animate-fadeIn">
          <ShieldCheck size={18} className="text-emerald-400" />
          <span>UNO CALLED SUCCESSFULLY!</span>
        </div>
      )}

      {/* Floating Catch UNO Alert if an Opponent has 1 card without calling UNO */}
      {catchableOpponents.length > 0 && (
        <div className="catch-uno-bar animate-fadeIn">
          {catchableOpponents.map((opp) => (
            <button
              key={opp.id}
              className="catch-uno-prompt-btn"
              onClick={() => onCatchOpponentUno(opp)}
            >
              <AlertCircle size={16} className="text-amber-400" />
              <span>Catch <strong>{opp.name}</strong> on 1 card! (Penalty +2)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnoControls;
