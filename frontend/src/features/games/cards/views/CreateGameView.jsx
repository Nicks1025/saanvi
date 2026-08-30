import React, { useState } from 'react';
import { ArrowLeft, Users, Flame, Sparkles, Clock, Check, HelpCircle } from 'lucide-react';
import { GAME_SCREENS, STACKING_RULES, WILD_FOUR_RULES } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const CreateGameView = ({ onNavigate, onCreateRoom, openRules }) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState(t('games.uno.default_room_name', 'Friday Game Night'));
  const [playerLimit, setPlayerLimit] = useState(8);
  const [stacking, setStacking] = useState(STACKING_RULES.ON);
  const [wildDrawFour, setWildDrawFour] = useState(WILD_FOUR_RULES.ALWAYS_ALLOWED);
  const [turnTimer, setTurnTimer] = useState(30);

  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gameName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    const newRoom = {
      name: gameName.trim(),
      playerLimit,
      rules: {
        stacking,
        wildDrawFour,
        turnTimer,
      },
    };

    setIsCreating(true);
    try {
      await onCreateRoom(newRoom);
    } catch (err) {
      // Allow retry if creation fails
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-game-view animate-fadeIn" id="create-game-view">
      {/* Top Header */}
      <div className="view-top-header">
        <button
          className="back-nav-btn"
          onClick={() => onNavigate(GAME_SCREENS.LOBBY)}
          aria-label={t('games.uno.back_to_lobby', 'Back to Lobby')}
        >
          <ArrowLeft size={18} />
          <span>{t('games.uno.back_to_lobby', 'Back to Lobby')}</span>
        </button>
        <button
          className="rules-helper-btn"
          onClick={() => openRules('stacking')}
          title={t('games.uno.rules_guide', 'Rules Guide')}
        >
          <HelpCircle size={16} />
          <span>{t('games.uno.rules_guide', 'Rules Guide')}</span>
        </button>
      </div>

      <div className="create-form-card">
        <div className="form-card-header">
          <div className="header-badge">{t('games.uno.host_table', 'HOST A TABLE')}</div>
          <h2>{t('games.uno.create_new_room', 'Create New Game Room')}</h2>
          <p>{t('games.uno.create_room_desc', 'Customize player limits, card stacking rules, and table timers.')}</p>
        </div>

        <form onSubmit={handleSubmit} className="room-create-form">
          {/* Game Name */}
          <div className="form-field-group">
            <label htmlFor="game-name-input">
              {t('games.uno.game_room_name', 'Game Room Name')} <span className="text-red-400">*</span>
            </label>
            <input
              id="game-name-input"
              type="text"
              className="s-form-input"
              placeholder={t('games.uno.enter_room_placeholder', 'e.g. Saturday Cards League')}
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          {/* Player Limit (2–8) */}
          <div className="form-field-group">
            <div className="field-label-row">
              <label>
                <Users size={16} className="inline-icon" />
                <span>{t('games.uno.players_count_label', 'Players Count')}</span>
              </label>
            </div>

            <div className="player-limit-stepper">
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`limit-pill-btn ${playerLimit === count ? 'is-selected' : ''}`}
                  onClick={() => setPlayerLimit(count)}
                >
                  {count} {count === 8 && <span className="default-tag">{t('common.default', 'Default')}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Rules Section Header */}
          <div className="form-rules-divider">
            <Flame size={16} className="text-amber-400" />
            <span>{t('games.uno.table_gameplay_rules', 'Table Gameplay Rules')}</span>
          </div>

          {/* DRAW CARD STACKING (ON / OFF) */}
          <div className="form-field-group rule-toggle-box">
            <div className="rule-box-header">
              <div className="rule-title-left">
                <label className="font-semibold">{t('games.uno.draw_card_stacking', 'DRAW CARD STACKING')}</label>
                <p className="rule-desc">
                  {t('games.uno.draw_card_stacking_desc', 'Allow chained counter-cards to accumulate draw penalties.')}
                </p>
              </div>

              <div className="segmented-toggle">
                <button
                  type="button"
                  className={`toggle-option ${stacking === STACKING_RULES.ON ? 'active-on' : ''}`}
                  onClick={() => setStacking(STACKING_RULES.ON)}
                >
                  {t('common.on', 'ON')}
                </button>
                <button
                  type="button"
                  className={`toggle-option ${stacking === STACKING_RULES.OFF ? 'active-off' : ''}`}
                  onClick={() => setStacking(STACKING_RULES.OFF)}
                >
                  {t('common.off', 'OFF')}
                </button>
              </div>
            </div>

            {/* Clear Stacking Explanation Card */}
            <div className={`stacking-explanation-card ${stacking === STACKING_RULES.ON ? 'theme-active' : 'theme-inactive'}`}>
              {stacking === STACKING_RULES.ON ? (
                <div className="explanation-list">
                  <div className="exp-item text-emerald-400">
                    <Check size={14} />
                    <span>{t('games.uno.plus2_on_plus2', '+2 on +2: Allowed (Next draws 4 or counters)')}</span>
                  </div>
                  <div className="exp-item text-emerald-400">
                    <Check size={14} />
                    <span>{t('games.uno.plus4_on_plus2', '+4 on +2: Allowed (Next draws 6 or counters)')}</span>
                  </div>
                  <div className="exp-item text-emerald-400">
                    <Check size={14} />
                    <span>{t('games.uno.plus4_on_plus4', '+4 on +4: Allowed (Next draws 8 or counters)')}</span>
                  </div>
                  <div className="exp-item text-red-400">
                    <span className="ban-symbol">&times;</span>
                    <span>{t('games.uno.plus2_on_plus4', '+2 on +4: CANNOT be played on +4')}</span>
                  </div>
                </div>
              ) : (
                <p className="exp-off-text">
                  {t('games.uno.stacking_off_desc', 'Stacking is OFF. When a +2 or +4 card is played, the immediate next player takes the draw penalty right away without counter-plays.')}
                </p>
              )}
            </div>
          </div>

          {/* WILD DRAW FOUR RULE */}
          <div className="form-field-group">
            <label className="font-semibold">
              <Sparkles size={16} className="inline-icon" />
              <span>{t('games.uno.wild_draw_four_restriction', 'Wild Draw Four (+4) Restriction')}</span>
            </label>

            <div className="radio-options-grid">
              <label
                className={`radio-card ${wildDrawFour === WILD_FOUR_RULES.ALWAYS_ALLOWED ? 'is-checked' : ''}`}
                onClick={() => setWildDrawFour(WILD_FOUR_RULES.ALWAYS_ALLOWED)}
              >
                <input
                  type="radio"
                  name="wildFourRule"
                  value={WILD_FOUR_RULES.ALWAYS_ALLOWED}
                  checked={wildDrawFour === WILD_FOUR_RULES.ALWAYS_ALLOWED}
                  onChange={() => setWildDrawFour(WILD_FOUR_RULES.ALWAYS_ALLOWED)}
                />
                <div className="radio-content">
                  <span className="radio-title">{t('games.uno.always_allowed', 'Always Allowed (Recommended)')}</span>
                  <span className="radio-sub">
                    {t('games.uno.always_allowed_desc', 'Player may play Wild Draw Four anytime, even when holding matching color cards.')}
                  </span>
                </div>
              </label>

              <label
                className={`radio-card ${wildDrawFour === WILD_FOUR_RULES.CLASSIC ? 'is-checked' : ''}`}
                onClick={() => setWildDrawFour(WILD_FOUR_RULES.CLASSIC)}
              >
                <input
                  type="radio"
                  name="wildFourRule"
                  value={WILD_FOUR_RULES.CLASSIC}
                  checked={wildDrawFour === WILD_FOUR_RULES.CLASSIC}
                  onChange={() => setWildDrawFour(WILD_FOUR_RULES.CLASSIC)}
                />
                <div className="radio-content">
                  <span className="radio-title">{t('games.uno.classic_uno_rule', 'Classic UNO Rule')}</span>
                  <span className="radio-sub">
                    {t('games.uno.classic_uno_rule_desc', 'Wild Draw Four may only be played if you hold no cards of the current active color.')}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Turn Timer Selection */}
          <div className="form-field-group">
            <div className="field-label-row">
              <label>
                <Clock size={16} className="inline-icon" />
                <span>{t('games.uno.turn_timer_label', 'Turn Timer')}</span>
              </label>
              <span className="field-subtext">{t('games.uno.turn_timer_subtext', 'Auto-draws if player is idle')}</span>
            </div>

            <div className="timer-pills-row">
              {[15, 30, 45, 60].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  className={`timer-pill ${turnTimer === seconds ? 'selected' : ''}`}
                  onClick={() => setTurnTimer(seconds)}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <div className="form-submit-actions">
            <button type="submit" className="s-button btn-primary btn-create-submit" disabled={isCreating}>
              <span>{isCreating ? t('games.uno.creating_room', 'Creating Room...') : t('games.uno.create_game_room', 'Create Game Room')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGameView;
