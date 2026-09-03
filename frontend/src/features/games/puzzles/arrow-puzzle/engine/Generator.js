import { createPuzzle, isMoveValid, doesObjectOverlap } from './PuzzleEngine.js';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const STEP = 50; // Logical grid step
const PADDING = 50; // Padding from edge

const DIRS = [
  { name: 'UP', dx: 0, dy: -1 },
  { name: 'DOWN', dx: 0, dy: 1 },
  { name: 'LEFT', dx: -1, dy: 0 },
  { name: 'RIGHT', dx: 1, dy: 0 },
];

const getPerpendicularDirs = (dirName) => {
  if (dirName === 'UP' || dirName === 'DOWN') return ['LEFT', 'RIGHT'];
  return ['UP', 'DOWN'];
};

const getDirByName = (name) => DIRS.find(d => d.name === name);

// --- Mask Functions ---
const maskSquare = (x, y, width, height) => {
  return x >= PADDING && x <= width - PADDING && y >= PADDING && y <= height - PADDING;
};

const maskCircle = (x, y, width, height) => {
  const cx = width / 2;
  const cy = height / 2;
  const r = (Math.min(width, height) / 2) - PADDING;
  return Math.pow(x - cx, 2) + Math.pow(y - cy, 2) <= r * r;
};

const maskHeart = (x, y, width, height) => {
  const cx = width / 2;
  const cy = height / 2 - 20; // Slight offset so heart is centered
  const scale = (Math.min(width, height) / 2 - PADDING) / 1.2; 
  
  const nx = (x - cx) / scale;
  const ny = -(y - cy) / scale; // Invert Y because SVG coordinates go down
  
  // Heart math: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
  const term1 = Math.pow(nx * nx + ny * ny - 1, 3);
  const term2 = nx * nx * Math.pow(ny, 3);
  return term1 - term2 <= 0;
};

const getMaskForLevel = (level) => {
  if (level % 10 === 0) return maskHeart;
  if (level % 5 === 0) return maskCircle;
  return maskSquare;
};

/**
 * Generates a structured orthogonal path strictly within the mask.
 */
const generateCandidatePath = (width, height, maskFunc, idCounter, maxSegments) => {
  const numSegments = randomInt(1, maxSegments);
  
  let currX, currY;
  let isValidStart = false;
  let attempts = 0;
  
  while (!isValidStart && attempts < 100) {
    currX = randomInt(1, Math.floor(width / STEP) - 1) * STEP;
    currY = randomInt(1, Math.floor(height / STEP) - 1) * STEP;
    if (maskFunc(currX, currY, width, height)) {
      isValidStart = true;
    }
    attempts++;
  }
  
  if (!isValidStart) return null;
  
  const points = [{ x: currX, y: currY }];
  let lastDirName = randomItem(DIRS).name;
  let finalDirName = lastDirName;

  for (let i = 0; i < numSegments; i++) {
    const steps = randomInt(1, 3);
    const dir = getDirByName(lastDirName);
    
    // Step-by-step walk to ensure we don't jump out of the mask
    for (let s = 1; s <= steps; s++) {
      const nextX = currX + dir.dx * STEP;
      const nextY = currY + dir.dy * STEP;
      
      if (!maskFunc(nextX, nextY, width, height)) {
        break; // Stop extending if it hits the mask edge
      }
      currX = nextX;
      currY = nextY;
    }
    
    points.push({ x: currX, y: currY });
    finalDirName = lastDirName;
    
    if (i < numSegments - 1) {
      lastDirName = randomItem(getPerpendicularDirs(lastDirName));
    }
  }

  // Filter 0-length segments
  const cleanedPoints = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleanedPoints[cleanedPoints.length - 1];
    const curr = points[i];
    if (prev.x !== curr.x || prev.y !== curr.y) {
      cleanedPoints.push(curr);
    }
  }

  if (cleanedPoints.length < 2) return null;
  
  const lastP = cleanedPoints[cleanedPoints.length - 1];
  const prevP = cleanedPoints[cleanedPoints.length - 2];
  if (lastP.x > prevP.x) finalDirName = 'RIGHT';
  else if (lastP.x < prevP.x) finalDirName = 'LEFT';
  else if (lastP.y > prevP.y) finalDirName = 'DOWN';
  else if (lastP.y < prevP.y) finalDirName = 'UP';

  return {
    id: `obj_${idCounter}`,
    dir: finalDirName,
    points: cleanedPoints,
    color: '#0f172a' 
  };
};

export const generatePuzzle = (level) => {
  // Infinite complexity scaling!
  // Width grows faster to accommodate density
  const size = Math.min(400 + level * 25, 1000);
  const width = size;
  const height = size;
  
  // Density grows linearly
  const targetDensity = Math.min(10 + Math.floor(level * 1.5), 150);
  
  // Higher levels allow more complex snakes (up to 5 segments)
  const maxSegments = Math.min(2 + Math.floor(level / 5), 5);
  
  const maskFunc = getMaskForLevel(level);

  let bestPuzzle = null;
  let bestCount = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    const puzzle = createPuzzle(width, height);
    let idCounter = 1;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 200; 

    while (puzzle.objects.length < targetDensity && consecutiveFailures < maxConsecutiveFailures) {
      const candidate = generateCandidatePath(width, height, maskFunc, idCounter, maxSegments);
      
      if (!candidate) {
        consecutiveFailures++;
        continue;
      }

      if (doesObjectOverlap(puzzle, candidate)) {
        consecutiveFailures++;
        continue;
      }

      puzzle.objects.push(candidate);
      if (isMoveValid(puzzle, candidate.id)) {
        idCounter++;
        consecutiveFailures = 0;
      } else {
        puzzle.objects.pop();
        consecutiveFailures++;
      }
    }
    
    if (puzzle.objects.length > bestCount) {
      bestCount = puzzle.objects.length;
      bestPuzzle = puzzle;
    }
    
    if (bestCount >= targetDensity * 0.8) break;
  }

  if (bestPuzzle) {
    bestPuzzle.objects.reverse();
  }
  
  return bestPuzzle;
};
