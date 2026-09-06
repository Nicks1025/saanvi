"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameBoard } from './components/GameBoard';
import { applyMove, isPuzzleSolved } from './engine/PuzzleEngine.js';
import { solvePuzzle } from './engine/Solver.js';
import SButton from '@/components/common/SButton';
import axiosClient from '@/services/axios.client.js';
import './arrow-puzzle.css';

export const ArrowPuzzleGame = ({ initialShape, initialLevel, liteMode = false }) => {
  const router = useRouter();
  const [level, setLevel] = useState(initialLevel);
  const [puzzle, setPuzzle] = useState(null);
  const [moves, setMoves] = useState(0);
  const [hintObjectId, setHintObjectId] = useState(null);
  const [isSolved, setIsSolved] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSolved || !puzzle || loading) return;
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isSolved, puzzle, loading]);

  const startNewGame = useCallback(async (currentLevel) => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/api/games/arrow-puzzle/generate?shape=${initialShape}&level=${currentLevel}&liteMode=${liteMode}`);
      if (response && response.data) {
        setPuzzle(response.data);
      } else {
        setPuzzle(response);
      }
      setMoves(0);
      setTimeElapsed(0);
      setHintObjectId(null);
      setIsSolved(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialShape, liteMode]);

  // Initial load
  useEffect(() => {
    if (initialLevel > 0) {
      startNewGame(initialLevel);
      setLevel(initialLevel);
    }
  }, [initialLevel, startNewGame]);

  const handleMoveAttempt = () => {
    if (!isSolved) {
      setMoves(prev => prev + 1);
    }
  };

  const handleObjectTap = useCallback((objectId) => {
    if (isSolved) return;
    
    setHintObjectId(null);
    setPuzzle(prev => {
      // Prevent double removal if already removed
      if (!prev.objects.find(o => o.id === objectId)) return prev;
      return applyMove(prev, objectId);
    });
  }, [isSolved]);

  useEffect(() => {
    if (puzzle && !isSolved && isPuzzleSolved(puzzle)) {
      setIsSolved(true);
      if (!liteMode) {
        axiosClient.post('/api/games/arrow-puzzle/progress', {
          shape: initialShape,
          level: level,
          timeTaken: timeElapsed
        }).catch(err => console.error("Failed to save progress", err));
      }
    }
  }, [puzzle, isSolved, liteMode, initialShape, level, timeElapsed]);

  const handleHint = () => {
    if (isSolved || hintObjectId) return;
    const solution = solvePuzzle(puzzle);
    if (solution && solution.length > 0) {
      setHintObjectId(solution[0]);
    }
  };

  const handleNextLevel = () => {
    if (liteMode && level >= 5) {
      setShowAuthPrompt(true);
      return;
    }

    const next = level + 1;

    
    if (liteMode) {
      setLevel(next);
      startNewGame(next);
    } else {
      // Route to new URL
      router.push(`/games/arrow-puzzle/${initialShape.toLowerCase()}/${next}`);
    }
  };

  const handleBackToMenu = () => {
    router.push('/games/arrow-puzzle');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!puzzle && !loading) return null;

  return (
    <div className="arrow-puzzle-feature">
      <div className="arrow-puzzle-header">
        {!liteMode ? (
          <SButton variant="secondary" icon="back" onClick={handleBackToMenu} title="Back to Menu" className="game-header-back" size="s" />
        ) : (
          <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '1rem', marginLeft: '0.25rem' }}>
            Arrow Puzzle
          </div>
        )}

        <div className="game-header-right">
          <span className="diff-badge active game-header-level">Level {level}</span>
          <div className="game-header-stats">
            {!liteMode && (
              <>
                <div className="stat">Moves: <strong>{moves}</strong></div>
                <div className="stat">Time: <strong>{formatTime(timeElapsed)}</strong></div>
              </>
            )}
            <SButton
              icon="hint"
              text="Hint"
              size="s"
              variant="secondary"
              onClick={handleHint}
              disabled={isSolved}
              className="control-btn"
            />
          </div>
        </div>
      </div>

      <div className="arrow-puzzle-body">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: '#64748b' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p>Generating puzzle...</p>
          </div>
        ) : showAuthPrompt ? (
          <div className="completion-modal">
            <SButton icon="add-user" size="xl" color="ghost" className="trophy-icon" disabled />
            <h3>Great job!</h3>
            <p style={{ maxWidth: '300px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
              You've completed the Quick Play trial. Create a free account to unlock unlimited levels and more games!
            </p>
            <div className="completion-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <SButton icon="add-user" text="Sign Up / Login" variant="primary" onClick={() => router.push('/login')} />
              <SButton text="Replay Level 5" variant="secondary" onClick={() => { setShowAuthPrompt(false); startNewGame(level); }} />
            </div>
          </div>
        ) : isSolved ? (
          <div className="completion-modal">
            <SButton icon="trophy" size="xl" color="ghost" className="trophy-icon" disabled />
            <h3>Level {level} Solved!</h3>
            <p>You cleared the board in {moves} moves.</p>
            <div className="completion-actions">
              <SButton icon="play" text="Replay Level" variant="secondary" onClick={() => startNewGame(level)} />
              <SButton 
                icon={liteMode && level >= 5 ? "add-user" : "play"} 
                text={liteMode && level >= 5 ? "Sign up to play more" : "Next Level"} 
                variant="primary" 
                onClick={handleNextLevel} 
              />
            </div>
          </div>
        ) : (
          <GameBoard
            puzzle={puzzle}
            shape={initialShape}
            onObjectTap={handleObjectTap}
              onMoveAttempt={handleMoveAttempt}
            hintObjectId={hintObjectId}
          />
        )}
      </div>
    </div>
  );
};
