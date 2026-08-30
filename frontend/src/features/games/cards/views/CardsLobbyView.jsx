import React, { useState, useEffect } from 'react';
import { PlusCircle, LogIn, BookOpen, Users, Sparkles, Trophy, Flame, Radio, Play, Trash2, ArrowRight } from 'lucide-react';
import { GAME_SCREENS } from '../types';
import SButton from '../../../../components/common/SButton';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export const CardsLobbyView = ({ onNavigate, openRules }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleCreateClick = () => {
    onNavigate(GAME_SCREENS.CREATE);
  };

  return (
    <div className="cards-lobby-view animate-fadeIn" id="cards-lobby-view">
      {/* Hero Header */}
      <div className="lobby-hero-card">
        <div className="lobby-hero-left">
          <div className="brand-pill">
            <Sparkles size={14} className="text-purple-400" />
            <span>{t('games.uno.multiplayer_tabletop', 'MULTIPLAYER TABLETOP')}</span>
          </div>
          <h1 className="lobby-hero-title">{t('games.uno.title', 'UNO')}</h1>
          <p className="lobby-hero-tagline">
            {t('games.uno.tagline', 'Play together. Think fast. Own the table.')}
          </p>

          {/* Primary Action Buttons */}
          <div className="lobby-primary-actions">
            <button
              className="s-button btn-primary btn-hero-action"
              onClick={handleCreateClick}
            >
              <PlusCircle size={18} />
              <span>{t('games.uno.create_game', 'Create Game')}</span>
            </button>

            <button
              className="s-button btn-hero-secondary"
              onClick={() => onNavigate(GAME_SCREENS.JOIN)}
            >
              <LogIn size={18} />
              <span>{t('games.uno.join_game', 'Join Game')}</span>
            </button>

          </div>
        </div>

        {/* Hero Visual Card Showcase */}
        <div className="lobby-hero-right">
          <div className="lobby-cards-graphic">
            <div className="graphic-card card-g-red">
              <span className="g-corner">7</span>
              <span className="g-center">7</span>
            </div>
            <div className="graphic-card card-g-blue">
              <span className="g-corner">⊘</span>
              <span className="g-center">⊘</span>
            </div>
            <div className="graphic-card card-g-wild">
              <span className="g-corner">✦</span>
              <span className="g-center">✦</span>
            </div>
            <div className="graphic-card card-g-green">
              <span className="g-corner">+2</span>
              <span className="g-center">+2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="lobby-highlights-grid">
        <div className="highlight-box">
          <div className="highlight-icon-wrap bg-purple-500/10 text-purple-400">
            <Users size={22} />
          </div>
          <h3>{t('games.uno.features.players_title', '2 to 8 Players')}</h3>
          <p>{t('games.uno.features.players_desc', 'Adaptive circular tabletop dynamically scaling from 1v1 duels to 8-player arena matches.')}</p>
        </div>

        <div className="highlight-box">
          <div className="highlight-icon-wrap bg-amber-500/10 text-amber-400">
            <Flame size={22} />
          </div>
          <h3>{t('games.uno.features.stacking_title', 'Draw Card Stacking')}</h3>
          <p>{t('games.uno.features.stacking_desc', 'Chain +2 on +2, +4 on +2, and +4 on +4 to redirect draw penalties across the circle.')}</p>
        </div>

        <div className="highlight-box">
          <div className="highlight-icon-wrap bg-emerald-500/10 text-emerald-400">
            <Radio size={22} />
          </div>
          <h3>{t('games.uno.features.voice_title', 'Integrated Voice Chat')}</h3>
          <p>{t('games.uno.features.voice_desc', 'Crystal-clear live audio indicator with individual mute, speaker controls, and speaking ring visualizer.')}</p>
        </div>

        <div className="highlight-box cursor-pointer" onClick={() => openRules('basics')}>
          <div className="highlight-icon-wrap bg-blue-500/10 text-blue-400">
            <BookOpen size={22} />
          </div>
          <h3>{t('games.uno.rules_guide', 'Rules & Card Guide')}</h3>
          <p>{t('games.uno.features.rules_desc', 'Learn matching mechanics, Wild selections, and the crucial UNO call & catch penalties.')}</p>
        </div>
      </div>

    </div>
  );
};

export default CardsLobbyView;
