import React from 'react';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const WordSearchHeader = ({ difficulty, timeElapsed, foundCount, totalCount }) => {
  return (
    <div className="ws-header">
      <div className="ws-header-title">
        <h2>Word Search</h2>
        <span className={`ws-difficulty badge-${difficulty}`}>{difficulty.toUpperCase()}</span>
      </div>
      <div className="ws-header-stats">
        <div className="ws-stat">
          <span className="ws-stat-label">Progress</span>
          <span className="ws-stat-value">{foundCount} / {totalCount}</span>
        </div>
        <div className="ws-stat">
          <span className="ws-stat-label">Time</span>
          <span className="ws-stat-value">{formatTime(timeElapsed)}</span>
        </div>
      </div>
    </div>
  );
};

export default WordSearchHeader;
