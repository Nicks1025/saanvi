import React from 'react';
import { Trophy, RotateCcw, LogOut, Award, Flame, Users, Sparkles } from 'lucide-react';
import { GAME_SCREENS } from '../types';

export const GameResultView = ({ gameResult, onLeaveGame }) => {
  const winner = gameResult?.winner || { name: 'You (Nikhil)', isLocal: true, score: 320 };
  const isLocalWinner = gameResult?.isLocalWinner ?? true;
  const scores = gameResult?.scores || [];
  
  const [timeLeft, setTimeLeft] = React.useState(10);
  
  React.useEffect(() => {
    if (timeLeft <= 0) {
      onLeaveGame();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onLeaveGame]);

  return (
    <div className="game-result-view animate-fadeIn" id="game-result-view">
      {/* Result Backdrop Fireworks / Glow */}
      <div className="result-backdrop-glow" />

      <div className="result-modal-card animate-scaleUp">
        {/* Victory/Defeat Header */}
        <div className={`result-header-banner ${isLocalWinner ? 'is-victory' : 'is-defeat'}`}>
          <div className="result-trophy-ring">
            <Trophy size={48} className={isLocalWinner ? 'text-amber-400' : 'text-purple-400'} />
          </div>
          <h1 className="result-title">
            {isLocalWinner ? 'VICTORY! YOU WON!' : `${winner.name} WINS!`}
          </h1>
          <p className="result-sub">
            {isLocalWinner
              ? 'Flawless table play! You emptied your hand and owned the circle.'
              : 'Great match! Better luck next round.'}
          </p>
        </div>

        {/* Winner Spotlight Card */}
        <div className="winner-spotlight">
          <div className="spotlight-avatar-wrap">
            {winner.avatar ? (
              <img src={winner.avatar} alt={winner.name} className="spotlight-avatar-img" />
            ) : (
              <div className="spotlight-avatar-fallback">
                {winner.avatarFallback || winner.name.slice(0, 2)}
              </div>
            )}
            <div className="spotlight-crown">👑</div>
          </div>
          <div className="spotlight-meta">
            <span className="spotlight-label">1ST PLACE CHAMPION</span>
            <h3 className="spotlight-name">{winner.name}</h3>
          </div>
          <div className="spotlight-score-tag">
            <Sparkles size={16} className="text-amber-400" />
            <span><strong>{winner.score || 320}</strong> pts</span>
          </div>
        </div>

        {/* Final Standings Table */}
        <div className="result-standings-section">
          <div className="standings-header">
            <h4>Final Match Standings</h4>
            <span className="standings-count">{scores.length} Players</span>
          </div>

          <div className="standings-table">
            <div className="standings-thead">
              <span className="col-rank">Rank</span>
              <span className="col-player">Player</span>
              <span className="col-cards">Cards Left</span>
              <span className="col-score">Total Score</span>
            </div>

            <div className="standings-tbody">
              {scores.map((item, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={item.id}
                    className={`standings-row rank-${rank} ${item.isLocal ? 'is-me' : ''}`}
                  >
                    <div className="col-rank">
                      {rank === 1 ? (
                        <span className="medal-badge gold">🥇 1st</span>
                      ) : rank === 2 ? (
                        <span className="medal-badge silver">🥈 2nd</span>
                      ) : rank === 3 ? (
                        <span className="medal-badge bronze">🥉 3rd</span>
                      ) : (
                        <span className="rank-num">#{rank}</span>
                      )}
                    </div>

                    <div className="col-player">
                      <span className="player-name-text">
                        {item.name} {item.isLocal && '(You)'}
                      </span>
                    </div>

                    <div className="col-cards">
                      <span className="cards-left-badge">
                        {item.cardsLeft === 0 ? 'Empty (0)' : `${item.cardsLeft} cards`}
                      </span>
                    </div>

                    <div className="col-score">
                      <span className="score-val">+{item.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="result-actions-row">
          <button className="s-button btn-hero-secondary" onClick={onLeaveGame}>
            <LogOut size={18} />
            <span>Back to Lobby ({timeLeft}s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultView;
