import React, { useState } from 'react';
import { Users, Flame, Sparkles, Clock, Check } from 'lucide-react';
import { GAME_SCREENS, STACKING_RULES, WILD_FOUR_RULES } from '../types';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SButton from '@/components/common/SButton';

export const CreateGameView = ({ onNavigate, onCreateRoom, openRules }) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState(t('games.uno.default_room_name'));
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
        <SButton
          className="back-nav-btn"
          color="secondary"
          onClick={() => onNavigate(GAME_SCREENS.LOBBY)}
          aria-label={t('games.uno.back_to_lobby')}
          icon="back"
          text={t('games.uno.back_to_lobby')}
        />
        <SButton
          className="rules-helper-btn"
          color="secondary"
          onClick={() => openRules('stacking')}
          title={t('games.uno.rules_guide')}
          icon="help"
          text={t('games.uno.rules_guide')}
        />
      </div>

      <div className="create-form-card">
        <div className="form-card-header">
          <div className="header-badge">{t('games.uno.host_table')}</div>
          <h2>{t('games.uno.create_new_room')}</h2>
          <p>{t('games.uno.create_room_desc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="room-create-form">
          {/* Game Name */}
          <div className="form-field-group">
            <label htmlFor="game-name-input">
              {t('games.uno.game_room_name')} <span className="text-red-400">*</span>
            </label>
            <input
              id="game-name-input"
              type="text"
              className="s-form-input"
              placeholder={t('games.uno.enter_room_placeholder')}
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
                <span>{t('games.uno.players_count_label')}</span>
              </label>
            </div>

            <div className="player-limit-stepper">
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <SButton
                  key={count}
                  type="button"
                  color={playerLimit === count ? 'primary' : 'secondary'}
                  className={`limit-pill-btn ${playerLimit === count ? 'is-selected' : ''}`}
                  onClick={() => setPlayerLimit(count)}
                >
                  {count}
                </SButton>
              ))}
            </div>
          </div>

          {/* Rules Section Header */}
          <div className="form-rules-divider">
            <Flame size={16} className="text-amber-400" />
            <span>{t('games.uno.table_gameplay_rules')}</span>
          </div>

          {/* DRAW CARD STACKING (ON / OFF) */}
          <div className="form-field-group rule-toggle-box">
            <div className="rule-box-header">
              <div className="rule-title-left">
                <label className="font-semibold">{t('games.uno.draw_card_stacking')}</label>
                <p className="rule-desc">
                  {t('games.uno.draw_card_stacking_desc')}
                </p>
              </div>

              <div className="segmented-toggle">
                <SButton
                  type="button"
                  color={stacking === STACKING_RULES.ON ? 'primary' : 'secondary'}
                  className={`toggle-option ${stacking === STACKING_RULES.ON ? 'active-on' : ''}`}
                  onClick={() => setStacking(STACKING_RULES.ON)}
                >
                  {t('common.on')}
                </SButton>
                <SButton
                  type="button"
                  color={stacking === STACKING_RULES.OFF ? 'danger' : 'secondary'}
                  className={`toggle-option ${stacking === STACKING_RULES.OFF ? 'active-off' : ''}`}
                  onClick={() => setStacking(STACKING_RULES.OFF)}
                >
                  {t('common.off')}
                </SButton>
              </div>
            </div>

            {/* Clear Stacking Explanation Card */}
            <div className={`stacking-explanation-card ${stacking === STACKING_RULES.ON ? 'theme-active' : 'theme-inactive'}`}>
              {stacking === STACKING_RULES.ON ? (
                <div className="explanation-list">
                  <div className="exp-item text-emerald-400">
                    <Check size={14} />
                    <span>{t('games.uno.plus2_on_plus2')}</span>
                  </div>
                  <div className="exp-item text-emerald-400">
                    <Check size={14} />
                    <span>{t('games.uno.plus4_on_plus2')}</span>
                  </div>
                  <div className="exp-item text-emerald-400">
                    <Check size={14} />
                    <span>{t('games.uno.plus4_on_plus4')}</span>
                  </div>
                  <div className="exp-item text-red-400">
                    <span className="ban-symbol">&times;</span>
                    <span>{t('games.uno.plus2_on_plus4')}</span>
                  </div>
                </div>
              ) : (
                <p className="exp-off-text">
                  {t('games.uno.stacking_off_desc')}
                </p>
              )}
            </div>
          </div>

          {/* WILD DRAW FOUR RULE */}
          <div className="form-field-group">
            <label className="font-semibold">
              <Sparkles size={16} className="inline-icon" />
              <span>{t('games.uno.wild_draw_four_restriction')}</span>
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
                  <span className="radio-title">{t('games.uno.always_allowed')}</span>
                  <span className="radio-sub">
                    {t('games.uno.always_allowed_desc')}
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
                  <span className="radio-title">{t('games.uno.classic_uno_rule')}</span>
                  <span className="radio-sub">
                    {t('games.uno.classic_uno_rule_desc')}
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
                <span>{t('games.uno.turn_timer_label')}</span>
              </label>
              <span className="field-subtext">{t('games.uno.turn_timer_subtext')}</span>
            </div>

            <div className="timer-pills-row">
              {[15, 30, 45, 60].map((seconds) => (
                <SButton
                  key={seconds}
                  type="button"
                  color={turnTimer === seconds ? 'primary' : 'secondary'}
                  className={`timer-pill ${turnTimer === seconds ? 'selected' : ''}`}
                  onClick={() => setTurnTimer(seconds)}
                >
                  {seconds}s
                </SButton>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <div className="form-submit-actions">
            <SButton type="submit" color="primary" className="btn-create-submit w-full" disabled={isCreating}>
              <span>{isCreating ? t('games.uno.creating_room') : t('games.uno.create_game_room')}</span>
            </SButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGameView;
