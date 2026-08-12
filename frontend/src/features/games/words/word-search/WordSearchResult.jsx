import React from 'react';
import { useNavigate } from 'react-router-dom';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const WordSearchResult = ({ score, timeElapsed, onPlayAgain }) => {
  const navigate = useNavigate();

  return (
    <div className="ws-result">
      <h2>Game Complete! 🎉</h2>
      <p>You found all the words.</p>
      
      <div className="ws-result-stats">
        <div className="ws-result-stat">
          <span className="ws-result-label">Time</span>
          <span className="ws-result-value">{formatTime(timeElapsed)}</span>
        </div>
        <div className="ws-result-stat">
          <span className="ws-result-label">Score</span>
          <span className="ws-result-value">{score}</span>
        </div>
      </div>

      <div className="ws-result-actions">
        <button className="s-button btn-primary" onClick={onPlayAgain}>Play Again</button>
        <button className="s-button" onClick={() => navigate('/')}>Back to Games</button>
      </div>
    </div>
  );
};

export default WordSearchResult;
