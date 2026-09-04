import test from 'node:test';
import assert from 'node:assert';
import { isMoveValid, createPuzzle, applyMove, isPuzzleSolved, getAvailableMoves, hasDeadlock } from './PuzzleEngine.js';

test('PuzzleEngine Logic', async (t) => {
  await t.test('Arrow blocked by another arrow should not be valid', () => {
    const puzzle = {
      width: 1000,
      height: 1000,
      objects: [
        { id: 'obj_1', dir: 'RIGHT', points: [{x: 100, y: 100}, {x: 200, y: 100}] },
        { id: 'obj_2', dir: 'UP', points: [{x: 300, y: 50}, {x: 300, y: 200}] }
      ]
    };
    // obj_1 moving RIGHT will hit obj_2 which spans y: 50 to 200 at x: 300.
    const isValid = isMoveValid(puzzle, 'obj_1');
    assert.strictEqual(isValid, false, 'Arrow should be blocked');
  });

  await t.test('Arrow with no obstacles should be valid', () => {
    const puzzle = {
      width: 1000,
      height: 1000,
      objects: [
        { id: 'obj_1', dir: 'RIGHT', points: [{x: 100, y: 100}, {x: 200, y: 100}] }
      ]
    };
    const isValid = isMoveValid(puzzle, 'obj_1');
    assert.strictEqual(isValid, true, 'Arrow should not be blocked');
  });

  await t.test('Arrow facing away from an obstacle should be valid', () => {
    const puzzle = {
      width: 1000,
      height: 1000,
      objects: [
        { id: 'obj_1', dir: 'LEFT', points: [{x: 100, y: 100}, {x: 200, y: 100}] },
        { id: 'obj_2', dir: 'UP', points: [{x: 300, y: 50}, {x: 300, y: 200}] }
      ]
    };
    // obj_1 moving LEFT will move away from obj_2 (at x=300).
    const isValid = isMoveValid(puzzle, 'obj_1');
    assert.strictEqual(isValid, true, 'Arrow should move freely away from obstacle');
  });

  await t.test('applyMove removes the object correctly', () => {
    const puzzle = {
      width: 1000,
      height: 1000,
      objects: [
        { id: 'obj_1', dir: 'RIGHT', points: [{x: 100, y: 100}, {x: 200, y: 100}] },
        { id: 'obj_2', dir: 'UP', points: [{x: 300, y: 50}, {x: 300, y: 200}] }
      ]
    };
    const nextPuzzle = applyMove(puzzle, 'obj_2');
    assert.strictEqual(nextPuzzle.objects.length, 1);
    assert.strictEqual(nextPuzzle.objects[0].id, 'obj_1');
  });

  await t.test('isPuzzleSolved correctly identifies an empty board', () => {
    const puzzle = { objects: [] };
    assert.strictEqual(isPuzzleSolved(puzzle), true);
    
    const puzzle2 = { objects: [{id: '1'}] };
    assert.strictEqual(isPuzzleSolved(puzzle2), false);
  });

  await t.test('Full Game Simulation: Complex Hardcoded Puzzle', () => {
    // Create a robust, layered interlocking puzzle
    let puzzle = {
      width: 1000,
      height: 1000,
      objects: [
        // Outer layer (can move immediately)
        { id: 'Outer_1', dir: 'RIGHT', points: [{x: 800, y: 100}, {x: 900, y: 100}] },
        { id: 'Outer_2', dir: 'UP', points: [{x: 100, y: 100}, {x: 100, y: 50}] },
        
        // Mid layer (blocked by Outer layer)
        { id: 'Mid_1', dir: 'RIGHT', points: [{x: 600, y: 100}, {x: 750, y: 100}] }, // Blocked by Outer_1
        { id: 'Mid_2', dir: 'UP', points: [{x: 100, y: 300}, {x: 100, y: 150}] }, // Blocked by Outer_2
        
        // Core layer (blocked by Mid layer)
        { id: 'Core_1', dir: 'RIGHT', points: [{x: 400, y: 100}, {x: 500, y: 100}] }, // Blocked by Mid_1
        { id: 'Core_2', dir: 'UP', points: [{x: 100, y: 500}, {x: 100, y: 400}] }, // Blocked by Mid_2
        
        // Interlocking crossing pieces
        { id: 'Cross_1', dir: 'DOWN', points: [{x: 450, y: 50}, {x: 450, y: 80}] }, // Blocked by Core_1
        { id: 'Cross_2', dir: 'LEFT', points: [{x: 200, y: 450}, {x: 150, y: 450}] } // Blocked by Core_2
      ]
    };
    
    assert.ok(puzzle.objects.length > 0, 'Puzzle should have objects');
    assert.strictEqual(hasDeadlock(puzzle), false, 'Generated puzzle should not be deadlocked');
    
    let moves = 0;
    const maxMoves = puzzle.objects.length; // Exact number of moves required
    
    while (!isPuzzleSolved(puzzle) && moves <= maxMoves) {
      const availableMoves = getAvailableMoves(puzzle);
      if (availableMoves.length === 0) break;
      
      const move = availableMoves[0];
      puzzle = applyMove(puzzle, move.id);
      moves++;
    }
    
    assert.strictEqual(isPuzzleSolved(puzzle), true, 'Complex puzzle should be fully solvable without getting stuck');
    assert.strictEqual(moves, maxMoves, 'Puzzle should be solved in exactly the number of objects it contains');
  });

  await t.test('Load Test: 100 Concurrent Users', async () => {
    // Simulate 100 users playing the game at the exact same time
    const CONCURRENT_USERS = 100;
    
    // Each user gets their own puzzle state
    const simulateUserSession = async (userId) => {
      let puzzle = {
        width: 1000,
        height: 1000,
        objects: [
          { id: `User${userId}_A`, dir: 'RIGHT', points: [{x: 800, y: 100}, {x: 900, y: 100}] },
          { id: `User${userId}_B`, dir: 'UP', points: [{x: 100, y: 100}, {x: 100, y: 50}] }
        ]
      };
      
      let moves = 0;
      // We use a slight async delay to force the event loop to interleave the 100 games
      // proving that the PuzzleEngine doesn't use unsafe global variables.
      while (!isPuzzleSolved(puzzle) && moves < 5) {
        await new Promise(resolve => setTimeout(resolve, 0)); 
        const availableMoves = getAvailableMoves(puzzle);
        if (availableMoves.length === 0) break;
        
        puzzle = applyMove(puzzle, availableMoves[0].id);
        moves++;
      }
      
      return { userId, solved: isPuzzleSolved(puzzle), moves };
    };

    // Fire off all 100 users concurrently
    const userPromises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      userPromises.push(simulateUserSession(i));
    }
    
    const results = await Promise.all(userPromises);
    
    // Verify every single user successfully completed their game
    for (const res of results) {
      assert.strictEqual(res.solved, true, `User ${res.userId} failed to solve their puzzle`);
      assert.strictEqual(res.moves, 2, `User ${res.userId} should have solved it in 2 moves`);
    }
  });

  await t.test('Deadlock Detection Logic', () => {
    // Manually create a 4-arrow cyclic deadlock box
    // A points RIGHT (blocked by B)
    // B points DOWN (blocked by C)
    // C points LEFT (blocked by D)
    // D points UP (blocked by A)
    const puzzle = {
      width: 1000,
      height: 1000,
      objects: [
        { id: 'A', dir: 'RIGHT', points: [{x: 100, y: 100}, {x: 200, y: 100}] },
        { id: 'B', dir: 'DOWN', points: [{x: 250, y: 50}, {x: 250, y: 150}] },
        { id: 'C', dir: 'LEFT', points: [{x: 300, y: 200}, {x: 200, y: 200}] },
        { id: 'D', dir: 'UP', points: [{x: 150, y: 250}, {x: 150, y: 150}] }
      ]
    };
    
    // Check cyclic deadlock detection
    assert.strictEqual(hasDeadlock(puzzle), true, 'Should detect cyclic dependencies');
    
    // No moves should be available
    const available = getAvailableMoves(puzzle);
    assert.strictEqual(available.length, 0, 'Deadlocked board should have 0 available moves');
  });
});
