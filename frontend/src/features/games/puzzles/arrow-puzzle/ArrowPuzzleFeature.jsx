import React, { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { generatePuzzle } from './engine/Generator.js';
import { applyMove, isPuzzleSolved } from './engine/PuzzleEngine.js';
import { solvePuzzle } from './engine/Solver.js';
import SButton from '@/components/common/SButton';
import { RefreshCw, Undo2, Lightbulb, Trophy } from 'lucide-react';
import './arrow-puzzle.css';

export const ArrowPuzzleFeature = () => {
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState(null);
  const [originalPuzzle, setOriginalPuzzle] = useState(null);
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [hintObjectId, setHintObjectId] = useState(null);
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    const savedLevel = localStorage.getItem('arrowPuzzleLevel');
    if (savedLevel) {
      setLevel(parseInt(savedLevel, 10));
    }
  }, []);

  const startNewGame = useCallback((currentLevel) => {
    const newPuzzle = generatePuzzle(currentLevel);
    setPuzzle(newPuzzle);
    setOriginalPuzzle(newPuzzle);
    setHistory([]);
    setMoves(0);
    setHintObjectId(null);
    setIsSolved(false);
  }, []);

  useEffect(() => {
    if (level) {
      startNewGame(level);
    }
  }, [level, startNewGame]);

  const handleObjectTap = (objectId) => {
    if (isSolved) return;
    
    const nextPuzzle = applyMove(puzzle, objectId);
    setHistory((prev) => [...prev, puzzle]);
    setPuzzle(nextPuzzle);
    setMoves((prev) => prev + 1);
    setHintObjectId(null);

    if (isPuzzleSolved(nextPuzzle)) {
      setIsSolved(true);
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || isSolved) return;
    const prevPuzzle = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPuzzle(prevPuzzle);
    setMoves((prev) => Math.max(0, prev - 1));
    setHintObjectId(null);
  };

  const handleRestart = () => {
    if (!originalPuzzle) return;
    setPuzzle(originalPuzzle);
    setHistory([]);
    setMoves(0);
    setHintObjectId(null);
    setIsSolved(false);
  };

  const handleHint = () => {
    if (isSolved || hintObjectId) return;
    const solution = solvePuzzle(puzzle);
    if (solution && solution.length > 0) {
      setHintObjectId(solution[0]);
    }
  };

  const handleNextLevel = () => {
    const next = level + 1;
    setLevel(next);
    localStorage.setItem('arrowPuzzleLevel', next.toString());
  };

  return (
    <div className="arrow-puzzle-feature">
      <div className="arrow-puzzle-header">
        <div>
          <h2>Arrow Puzzle</h2>
          <div className="difficulty-selector">
            <span className="diff-badge active">Level {level}</span>
          </div>
        </div>
        <div className="stats-box">
          <div className="stat">Moves: <strong>{moves}</strong></div>
        </div>
      </div>

      <div className="arrow-puzzle-body">
        {isSolved ? (
          <div className="completion-modal">
            <Trophy size={64} className="trophy-icon" />
            <h3>Level {level} Solved!</h3>
            <p>You cleared the board in {moves} moves.</p>
            <div className="completion-actions">
              <SButton variant="secondary" onClick={() => startNewGame(level)}>
                Replay Level
              </SButton>
              <SButton variant="primary" onClick={handleNextLevel}>
                Next Level
              </SButton>
            </div>
          </div>
        ) : (
          <GameBoard
            puzzle={puzzle}
            onObjectTap={handleObjectTap}
            hintObjectId={hintObjectId}
          />
        )}
      </div>

      <div className="arrow-puzzle-controls">
        <SButton 
          variant="secondary" 
          onClick={handleUndo} 
          disabled={history.length === 0 || isSolved}
          className="control-btn"
        >
          <Undo2 size={18} /> Undo
        </SButton>
        <SButton 
          variant="secondary" 
          onClick={handleHint}
          disabled={isSolved}
          className="control-btn"
        >
          <Lightbulb size={18} /> Hint
        </SButton>
        <SButton 
          variant="danger" 
          onClick={handleRestart}
          disabled={moves === 0 || isSolved}
          className="control-btn"
        >
          <RefreshCw size={18} /> Restart
        </SButton>
      </div>
    </div>
  );
};
