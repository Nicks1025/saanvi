import React, { useState } from 'react';
import {
  Copy,
  Check,
  Crown,
  Play,
  ArrowLeft,
  Users,
  Flame,
  Sparkles,
  Clock,
  BookOpen,
  CheckCircle2,
  Hourglass,
  Plus,
  Trash2,
} from 'lucide-react';
import { GAME_SCREENS, STACKING_RULES, WILD_FOUR_RULES } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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
        <button className="back-nav-btn" onClick={onLeaveRoom}>
          <ArrowLeft size={18} />
          <span>{t('games.uno.leave_room', 'Leave Room')}</span>
        </button>

        <div className="waiting-room-code-badge">
          <span className="code-label">{t('games.uno.room_code_label', 'ROOM:')}</span>
          <span className="code-value">{roomCode}</span>
          <button
            className="copy-code-btn"
            onClick={handleCopyLink}
            title="Copy room invite link"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? t('common.copied', 'Copied!') : t('common.copy_link', 'Copy Link')}</span>
          </button>
        </div>

        <button className="rules-helper-btn" onClick={() => openRules('basics')}>
          <BookOpen size={16} />
          <span>{t('games.uno.view_rules', 'View Rules')}</span>
        </button>
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
              <button
                className={`s-button btn-primary btn-start-game ${!allPlayersReady || players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={onStartGame}
                disabled={!allPlayersReady || players.length < 2}
              >
                <Play size={18} />
                <span>Start Game ({players.length} Players)</span>
              </button>
            ) : (
              <button
                className={`s-button ${isLocalReady ? 'btn-ready-active' : 'btn-primary'}`}
                onClick={handleToggleReady}
              >
                <CheckCircle2 size={18} />
                <span>{isLocalReady ? 'Ready! (Click to Unready)' : "I'm Ready"}</span>
              </button>
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

          <button className="rules-full-modal-btn" onClick={() => openRules('basics')}>
            <BookOpen size={16} />
            <span>Open Complete Rules Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoomView;
