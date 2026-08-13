import React from 'react';
import { useTranslation } from 'react-i18next';

const WordSearchWordList = ({ words, foundWords }) => {
  const { t } = useTranslation();
  return (
    <div className="ws-word-list-container">
      <h3>{t('games.word_search.find_these_words')}</h3>
      <ul className="ws-word-list">
        {words.map(w => {
          const isFound = foundWords.includes(w.uuid);
          return (
            <li key={w.uuid} className={`ws-word-item ${isFound ? 'found' : ''}`}>
              <span className="ws-word-check">{isFound ? '✓' : ''}</span>
              <span className="ws-word-text">{w.word}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WordSearchWordList;
