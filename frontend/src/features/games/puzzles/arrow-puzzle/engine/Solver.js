import { getAvailableMoves, applyMove, isPuzzleSolved } from './PuzzleEngine.js';

/**
 * Attempts to solve the puzzle completely.
 * Returns an array of object IDs representing the solution sequence.
 * Returns null if the puzzle is unsolvable.
 */
export const solvePuzzle = (puzzle) => {
  // A naive depth-first search for a solution path.
  // We avoid modifying the original puzzle.
  const stack = [{ currentPuzzle: puzzle, path: [], visited: new Set() }];

  while (stack.length > 0) {
    const { currentPuzzle, path, visited } = stack.pop();

    if (isPuzzleSolved(currentPuzzle)) {
      return path; // Solution found!
    }

    const availableMoves = getAvailableMoves(currentPuzzle);

    // If no moves are available and we haven't solved it, this path is a dead end.
    if (availableMoves.length === 0) continue;

    // To prevent infinite loops or redundant searches, we can use a state hash if needed.
    // However, since pieces are strictly removed, the state strictly decreases.
    // We can just pick any available move. Actually, in this specific game mechanics,
    // if a piece can escape, removing it will NEVER block another piece. It only frees up space.
    // Therefore, any valid move is always a correct move. The order among currently free pieces doesn't matter.
    // This is a known property of 'Tap Away' puzzles. 
    // We don't need backtracking! We can just greedily remove anything that is free.
    
    // Greedy solve:
    let nextPuzzle = currentPuzzle;
    let nextPath = [...path];
    let madeProgress = true;

    while (madeProgress && !isPuzzleSolved(nextPuzzle)) {
      const moves = getAvailableMoves(nextPuzzle);
      if (moves.length === 0) {
        madeProgress = false;
        break;
      }

      // Just pick the first available move
      const move = moves[0];
      nextPath.push(move.id);
      nextPuzzle = applyMove(nextPuzzle, move.id);
    }

    if (isPuzzleSolved(nextPuzzle)) {
      return nextPath;
    } else {
      return null; // Unsolvable (cycles or trapped pieces)
    }
  }

  return null;
};
