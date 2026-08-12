import React from 'react';

const WordSearchWordList = ({ words, foundWords }) => {
  return (
    <div className="ws-word-list-container">
      <h3>FIND THESE WORDS</h3>
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
