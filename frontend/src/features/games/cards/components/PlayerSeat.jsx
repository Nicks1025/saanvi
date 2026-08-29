import React from 'react';
import { Mic, MicOff, Crown, AlertTriangle, Radio, ShieldAlert } from 'lucide-react';

export const PlayerSeat = ({
  player,
  isCurrentTurn = false,
  turnTimeLeft = null,
  onCatchUno,
  onToggleMute,
  position = 'top', // 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'bottom'
  compact = false,
}) => {
  if (!player) return null;

  const {
    id,
    name,
    isLocal,
    isHost,
    avatar,
    avatarFallback,
    cardCount,
    isSpeaking,
    isMuted,
    connectionStatus = 'connected',
    hasCalledUno = false,
    missedUno = false,
  } = player;

  const showCatchUnoButton = !isLocal && cardCount === 1 && !hasCalledUno && !missedUno;

  return (
    <div
      className={`player-seat seat-pos-${position} ${isCurrentTurn ? 'is-active-turn' : ''} ${
        isLocal ? 'is-local-player' : ''
      } ${isSpeaking ? 'is-speaking' : ''} ${compact ? 'is-compact' : ''}`}
      id={`player-seat-${id}`}
    >
      {/* Turn Glow Halo */}
      {isCurrentTurn && (
        <div className="seat-turn-halo">
          <span className="turn-radar-sweep" />
        </div>
      )}

      {/* Main Avatar Container */}
      <div className="seat-avatar-wrapper">
        <div className={`seat-avatar ${isSpeaking ? 'speaking-pulse' : ''}`}>
          {avatar ? (
            <img src={avatar} alt={name} className="avatar-img" />
          ) : (
            <div className="avatar-fallback">{avatarFallback || name.slice(0, 2).toUpperCase()}</div>
          )}

          {/* Host Crown */}
          {isHost && (
            <div className="host-badge" title="Room Host">
              <Crown size={12} className="crown-icon" />
            </div>
          )}

          {/* Connection Status Dot */}
          <div
            className={`connection-dot status-${connectionStatus}`}
            title={`Connection: ${connectionStatus}`}
          />

          {/* Voice Indicator Badge */}
          <div
            className={`voice-indicator-badge ${isMuted ? 'muted' : isSpeaking ? 'speaking' : 'ready'}`}
            onClick={onToggleMute ? () => onToggleMute(id) : undefined}
            title={isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Mic Active'}
          >
            {isMuted ? (
              <MicOff size={11} />
            ) : isSpeaking ? (
              <Radio size={11} className="pulse-icon" />
            ) : (
              <Mic size={11} />
            )}
          </div>
        </div>

        {/* Floating UNO Alert / Badge */}
        {hasCalledUno && cardCount === 1 && (
          <div className="uno-called-badge animate-bounce" title="UNO Called!">
            <span>UNO!</span>
          </div>
        )}

        {/* Missed UNO Penalty Warning */}
        {missedUno && (
          <div className="uno-missed-badge" title="UNO Missed! +2 Penalty">
            <ShieldAlert size={12} />
            <span>PENALTY</span>
          </div>
        )}
      </div>

      {/* Player Meta Details */}
      <div className="seat-info">
        <div className="seat-name-row">
          <span className="seat-name" title={name}>
            {name}
          </span>
          {isLocal && <span className="you-pill">YOU</span>}
        </div>

        {/* Card Count Badge & Visual Stacks */}
        <div className="seat-cards-badge" title={`${cardCount} cards in hand`}>
          <div className="mini-card-stack">
            <span className="mini-card-layer layer-3" />
            <span className="mini-card-layer layer-2" />
            <span className="mini-card-layer layer-1" />
          </div>
          <span className="card-count-number">{cardCount} {cardCount === 1 ? 'card' : 'cards'}</span>
        </div>



        {/* Catch UNO Action Button for opponents */}
        {showCatchUnoButton && onCatchUno && (
          <button
            className="catch-uno-action-btn animate-pulse"
            onClick={() => onCatchUno(player)}
            title="Catch uncalled UNO! (+2 penalty to opponent)"
          >
            <AlertTriangle size={12} />
            <span>CATCH UNO!</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerSeat;
