import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './wordSearch.css';

const WordSearchMenu = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleStart = (difficulty) => {
    navigate(`/games/word-search/play?difficulty=${difficulty}`);
  };

  return (
    <div className="ws-container page-container">
      <div className="ws-menu">
        <h2>{t('games.word_search.select_difficulty')}</h2>
        <div className="ws-menu-buttons">
          <button className="s-button btn-primary" onClick={() => handleStart('easy')}>{t('games.word_search.easy')}</button>
          <button className="s-button btn-primary" onClick={() => handleStart('medium')}>{t('games.word_search.medium')}</button>
          <button className="s-button btn-primary" onClick={() => handleStart('hard')}>{t('games.word_search.hard')}</button>
        </div>
      </div>
    </div>
  );
};

export default WordSearchMenu;
