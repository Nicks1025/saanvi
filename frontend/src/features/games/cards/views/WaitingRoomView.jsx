import React, { useState } from 'react';
import {
  Crown,
  Users,
  Flame,
  Sparkles,
  Clock,
  CheckCircle2,
  Hourglass,
  Plus,
  Trash2,
} from 'lucide-react';
import { GAME_SCREENS, STACKING_RULES, WILD_FOUR_RULES } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SButton from '@/components/common/SButton';

export const WaitingRoomView = ({
  room,
  players,
  setPlayers,
  onStartGame,
  onLeaveRoom,
  openRules,
  isHost = true,
  onToggleReady,
  onToggleHost,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  
  const localPlayer = players.find(p => p.isLocal);
  const [isLocalReady, setIsLocalReady] = useState(() => localPlayer ? localPlayer.isReady : false);
  
  // Sync state with server reality
  React.useEffect(() => {
    if (localPlayer) {
      setIsLocalReady(localPlayer.isReady);
    }
  }, [localPlayer?.isReady]);

  const allPlayersReady = players.length > 0 && players.every(p => p.isReady);

  const playerLimit = room?.playerLimit || 8;
  const roomCode = room?.code || 'X7K29';

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(window.location.origin + `/games/uno/${roomCode}`);
    setCopied(true);
    toast.success(`Invite link for room ${roomCode} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    const nextReady = !isLocalReady;
    setIsLocalReady(nextReady); // Optimistic UI update
    
    if (onToggleReady) {
      onToggleReady(nextReady);
    }
  };

  // Generate 8 grid slots
  const slots = Array.from({ length: playerLimit }).map((_, index) => {
    const player = players[index] || null;
    return {
      slotNumber: index + 1,
      player,
    };
  });

  return (
    <div className="waiting-room-view animate-fadeIn" id="waiting-room-view">
      {/* Top Header */}
      <div className="waiting-top-bar">
        <SButton 
          className="back-nav-btn" 
          color="secondary"
          onClick={onLeaveRoom}
          icon="back"
          text={t('games.uno.leave_room', 'Leave Room')}
        />

        <div className="waiting-room-code-badge">
          <span className="code-label">{t('games.uno.room_code_label', 'ROOM:')}</span>
          <span className="code-value">{roomCode}</span>
          <SButton
            className="copy-code-btn"
            color="secondary"
            onClick={handleCopyLink}
            title="Copy room invite link"
            icon={copied ? "check" : "copy"}
            text={copied ? t('common.copied', 'Copied!') : t('common.copy_link', 'Copy Link')}
          />
        </div>

        <SButton 
          className="rules-helper-btn" 
          color="secondary"
          onClick={() => openRules('basics')}
          icon="help"
          text={t('games.uno.view_rules', 'View Rules')}
        />
      </div>

      {/* Main Waiting Room Layout */}
      <div className="waiting-main-grid">
        {/* Left Column: Players Roster & Seats */}
        <div className="waiting-roster-card">
          <div className="roster-header">
            <div className="roster-title-group">
              <Users size={20} className="text-purple-400" />
              <h3>{t('games.uno.table_players', 'Table Players')} ({players.length}/{playerLimit})</h3>
            </div>
            <span className="ready-summary-tag">
              {players.filter((p) => p.isReady).length} {t('games.uno.ready', 'Ready')}
            </span>
          </div>

          <div className="seats-grid">
            {slots.map(({ slotNumber, player }) => {
              if (player) {
                return (
                  <div
                    key={player.id}
                    className={`waiting-player-slot filled ${player.isLocal ? 'is-self' : ''} ${
                      player.isReady ? 'is-ready' : 'is-waiting'
                    }`}
                  >
                    <div className="slot-avatar-wrap">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="slot-avatar-img" />
                      ) : (
                        <div className="slot-avatar-fallback">
                          {player.avatarFallback || player.name.slice(0, 2)}
                        </div>
                      )}
                      {player.isHost && (
                        <div className="slot-crown" title="Room Host">
                          <Crown size={12} />
                        </div>
                      )}
                    </div>

                    <div className="slot-meta">
                      <div className="slot-name-row">
                        <span className="slot-name">{player.name}</span>
                        {player.isLocal && <span className="self-tag">YOU</span>}
                      </div>
                      <span className={`slot-status ${player.isReady ? 'status-ready' : 'status-waiting'}`}>
                        {player.isReady ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>{t('games.uno.ready', 'Ready')}</span>
                          </>
                        ) : (
                          <>
                            <Hourglass size={12} />
                            <span>{t('games.uno.waiting_ellipsis', 'Waiting...')}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={`empty-${slotNumber}`} className="waiting-player-slot empty">
                  <div className="empty-avatar-circle">
                    <span className="empty-plus">+</span>
                  </div>
                  <div className="slot-meta">
                    <span className="empty-label">{t('games.uno.empty_seat', 'Empty Seat')}</span>
                    <span className="empty-sub">{t('games.uno.waiting_for_player', 'Waiting for player...')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="waiting-actions-row">
            {isHost ? (
              <SButton
                className={`btn-start-game ${!allPlayersReady || players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                color="primary"
                onClick={onStartGame}
                disabled={!allPlayersReady || players.length < 2}
                icon="play"
                text={`Start Game (${players.length} Players)`}
              />
            ) : (
              <SButton
                className={isLocalReady ? 'btn-ready-active' : ''}
                color={isLocalReady ? 'secondary' : 'primary'}
                onClick={handleToggleReady}
                icon="check-circle"
                text={isLocalReady ? 'Ready! (Click to Unready)' : "I'm Ready"}
              />
            )}
          </div>
        </div>

        {/* Right Column: Room Settings & Rules Overview */}
        <div className="waiting-rules-card">
          <div className="rules-card-header">
            <h4>Selected Match Rules</h4>
            <span className="preset-name-pill">{room?.name || 'Custom Match'}</span>
          </div>

          <div className="rules-summary-list">
            <div className="rule-summary-row">
              <div className="summary-icon bg-amber-500/10 text-amber-400">
                <Flame size={16} />
              </div>
              <div className="summary-details">
                <span className="summary-title">Draw Card Stacking</span>
                <span className="summary-badge tag-active">
                  {room?.rules?.stacking === STACKING_RULES.ON ? 'ON (+2 on +2, +4 on +2, +4 on +4)' : 'OFF (Immediate penalty)'}
                </span>
              </div>
            </div>

            <div className="rule-summary-row">
              <div className="summary-icon bg-purple-500/10 text-purple-400">
                <Sparkles size={16} />
              </div>
              <div className="summary-details">
                <span className="summary-title">Wild Draw Four</span>
                <span className="summary-badge tag-purple">
                  {room?.rules?.wildDrawFour === WILD_FOUR_RULES.ALWAYS_ALLOWED
                    ? 'Always Allowed'
                    : 'Classic Restriction'}
                </span>
              </div>
            </div>

            <div className="rule-summary-row">
              <div className="summary-icon bg-blue-500/10 text-blue-400">
                <Clock size={16} />
              </div>
              <div className="summary-details">
                <span className="summary-title">Turn Timer</span>
                <span className="summary-badge tag-blue">{room?.rules?.turnTimer || 30} Seconds</span>
              </div>
            </div>
          </div>

          <div className="quick-rules-reminder">
            <h5>★ UNO Reminder:</h5>
            <p>
              Remember to press <strong>[ CALL UNO! ]</strong> when down to your last card, before opponents catch you!
            </p>
          </div>

          <SButton 
            className="rules-full-modal-btn" 
            color="secondary"
            onClick={() => openRules('basics')}
            icon="help"
            text="Open Complete Rules Guide"
          />
        </div>
      </div>
    </div>
  );
};

export default WaitingRoomView;
