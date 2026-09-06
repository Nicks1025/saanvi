import React, { useState } from 'react';
import { KeyRound, AlertCircle, Sparkles } from 'lucide-react';
import { GAME_SCREENS } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SButton from '@/components/common/SButton';

export const JoinGameView = ({ onNavigate, onJoinRoom }) => {
  const { t } = useTranslation();
  const [roomInput, setRoomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoin = (codeToJoin) => {
    const raw = (codeToJoin || roomInput).trim().toUpperCase();
    if (!raw) {
      setErrorMessage(t('games.uno.enter_room_error', 'Please enter a room code or invite link.'));
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    // Let the parent component handle the actual promise and UI feedback
    // but we can clear loading instantly since toast handles it
    onJoinRoom(raw);
    setIsLoading(false);
  };

  const handlePasteDemo = (code) => {
    setRoomInput(code);
    setErrorMessage('');
  };

  return (
    <div className="join-game-view animate-fadeIn" id="join-game-view">
      {/* Top Navigation */}
      <div className="view-top-header">
        <SButton
          color="secondary"
          className="back-nav-btn"
          onClick={() => onNavigate(GAME_SCREENS.LOBBY)}
          aria-label={t('games.uno.back_to_lobby', 'Back to Lobby')}
          icon="back"
          text={t('games.uno.back_to_lobby', 'Back to Lobby')}
        />
      </div>

      <div className="join-form-card">
        <div className="form-card-header">
          <div className="header-badge">{t('games.uno.enter_multiplayer', 'ENTER MULTIPLAYER')}</div>
          <h2>{t('games.uno.join_table', 'Join a Game Table')}</h2>
          <p>{t('games.uno.join_table_desc', 'Enter the 5-character room code or paste the game invite link.')}</p>
        </div>

        <div className="join-input-section">
          <div className="room-code-input-wrapper">
            <KeyRound size={20} className="input-prefix-icon text-purple-400" />
            <input
              type="text"
              className="room-code-field"
              placeholder="e.g. X7K29"
              value={roomInput}
              onChange={(e) => {
                setRoomInput(e.target.value.toUpperCase());
                setErrorMessage('');
              }}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
            />
            {roomInput && (
              <SButton
                color="secondary"
                className="clear-code-btn"
                onClick={() => setRoomInput('')}
                aria-label="Clear input"
                icon="close"
              />
            )}
          </div>

          {errorMessage && (
            <div className="join-error-box animate-fadeIn">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <SButton
            color="primary"
            className="btn-join-submit w-full"
            onClick={() => handleJoin()}
            disabled={isLoading}
            loading={isLoading}
            icon={isLoading ? null : "check-circle"}
            text={isLoading ? t('games.uno.connecting_room', 'Connecting to Room...') : t('games.uno.join_game', 'Join Game')}
          />
        </div>

        {/* Quick Demo Presets */}
        <div className="join-demo-presets">
          <div className="presets-label">
            <Sparkles size={14} className="text-amber-400" />
            <span>Or Quick-Join a Demo Room:</span>
          </div>

          <div className="demo-chips-grid">
            <SButton
              color="secondary"
              className="demo-chip-btn"
              onClick={() => {
                handlePasteDemo('X7K29');
                handleJoin('X7K29');
              }}
            >
              <span className="chip-code">X7K29</span>
              <span className="chip-desc">Friday Game Night (4 Players)</span>
            </SButton>

            <SButton
              color="secondary"
              className="demo-chip-btn"
              onClick={() => {
                handlePasteDemo('ARENA8');
                handleJoin('ARENA8');
              }}
            >
              <span className="chip-code">ARENA8</span>
              <span className="chip-desc">8-Player Tabletop</span>
            </SButton>

            <SButton
              color="secondary"
              className="demo-chip-btn"
              onClick={() => {
                handlePasteDemo('DUEL2');
                handleJoin('DUEL2');
              }}
            >
              <span className="chip-code">DUEL2</span>
              <span className="chip-desc">1v1 Speed Match</span>
            </SButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinGameView;
