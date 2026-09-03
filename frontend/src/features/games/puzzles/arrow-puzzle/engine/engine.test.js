import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPuzzle, isMoveValid } from './PuzzleEngine.js';
import { generatePuzzle } from './Generator.js';
import { solvePuzzle } from './Solver.js';

describe('Arrow Puzzle Engine - Continuous Stroke Geometry', () => {
  it('should validate simple moves', () => {
    const puzzle = createPuzzle(500, 500);
    puzzle.objects.push({
      id: '1',
      dir: 'RIGHT',
      points: [{ x: 100, y: 100 }, { x: 200, y: 100 }]
    });

    // Object 1 can escape to the right
    assert.strictEqual(isMoveValid(puzzle, '1'), true);

    puzzle.objects.push({
      id: '2',
      dir: 'UP',
      points: [{ x: 300, y: 50 }, { x: 300, y: 150 }]
    });

    // Object 1 is now blocked by Object 2 on the right
    assert.strictEqual(isMoveValid(puzzle, '1'), false);

    // Object 2 can escape UP
    assert.strictEqual(isMoveValid(puzzle, '2'), true);
  });

  it('should validate complex L-shape moves', () => {
    const puzzle = createPuzzle(500, 500);
    // L shape:
    puzzle.objects.push({
      id: 'L1',
      dir: 'RIGHT',
      points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }]
    });

    assert.strictEqual(isMoveValid(puzzle, 'L1'), true);

    // Block the lower part of the L
    puzzle.objects.push({
      id: 'Block',
      dir: 'DOWN',
      points: [{ x: 300, y: 180 }, { x: 300, y: 220 }]
    });

    assert.strictEqual(isMoveValid(puzzle, 'L1'), false); 
  });

  describe('Procedural Generator & Solver Stress Test', () => {
    it('should generate completely solvable early levels (1)', () => {
      const puzzle = generatePuzzle(1);
      assert.ok(puzzle.objects.length > 5, 'Early levels should have a decent number of pieces');
      
      const solution = solvePuzzle(puzzle);
      assert.ok(solution.length > 0, 'Puzzle must be completely solvable');
      assert.strictEqual(solution.length, puzzle.objects.length, 'Every object must be escapable');
    });

    it('should generate completely solvable hard levels (15)', () => {
      const puzzle = generatePuzzle(15);
      assert.ok(puzzle.objects.length > 10, 'Hard levels should generate successfully');
      
      const solution = solvePuzzle(puzzle);
      assert.ok(solution.length > 0, 'Hard puzzle must be completely solvable');
      assert.strictEqual(solution.length, puzzle.objects.length, 'Every object in hard puzzle must be escapable');
    });
  });
});
