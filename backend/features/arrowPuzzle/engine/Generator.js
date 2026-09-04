const { createPuzzle, doesObjectOverlap, hasDeadlock } = require('./PuzzleEngine.js');

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const STEP = 35; // Finer logical grid step to allow better shape definition
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

const SHAPES = {
  SQUARE: 'Square',
  CIRCLE: 'Circle',
  HEART: 'Heart'
};

const SHAPE_MASKS = {
  [SHAPES.SQUARE]: maskSquare,
  [SHAPES.CIRCLE]: maskCircle,
  [SHAPES.HEART]: maskHeart
};

/**
 * Generates a structured orthogonal path strictly within the mask.
 */
const generateCandidatePath = (width, height, maskFunc, idCounter, minSegments, maxSegments) => {
  const numSegments = randomInt(minSegments, maxSegments);
  
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

  // Filter 0-length segments and enforce strict orthogonal alternation
  const cleanedPoints = [points[0]];
  let lastAxis = null;

  for (let i = 1; i < points.length; i++) {
    const prev = cleanedPoints[cleanedPoints.length - 1];
    const curr = points[i];
    
    if (prev.x === curr.x && prev.y === curr.y) continue; // Skip 0-length
    
    const currentAxis = (prev.x !== curr.x) ? 'X' : 'Y';
    
    // If we move on the same axis twice, a perpendicular segment was 0-length.
    // This creates collinear extensions or double-backs. Reject it.
    if (lastAxis === currentAxis) {
      return null;
    }
    
    cleanedPoints.push(curr);
    lastAxis = currentAxis;
  }

  // A valid arrow of N segments must have exactly N + 1 points.
  if (cleanedPoints.length - 1 < minSegments) {
    return null;
  }
  
  // Check for self-intersection (prevents ugly loops)
  for (let i = 0; i < cleanedPoints.length - 1; i++) {
    const minXA = Math.min(cleanedPoints[i].x, cleanedPoints[i+1].x);
    const maxXA = Math.max(cleanedPoints[i].x, cleanedPoints[i+1].x);
    const minYA = Math.min(cleanedPoints[i].y, cleanedPoints[i+1].y);
    const maxYA = Math.max(cleanedPoints[i].y, cleanedPoints[i+1].y);
    
    for (let j = i + 2; j < cleanedPoints.length - 1; j++) {
      // Ignore adjacent segments intersecting at their shared vertex (j=i+1)
      const minXC = Math.min(cleanedPoints[j].x, cleanedPoints[j+1].x);
      const maxXC = Math.max(cleanedPoints[j].x, cleanedPoints[j+1].x);
      const minYC = Math.min(cleanedPoints[j].y, cleanedPoints[j+1].y);
      const maxYC = Math.max(cleanedPoints[j].y, cleanedPoints[j+1].y);
      
      if (minXA <= maxXC && maxXA >= minXC && minYA <= maxYC && maxYA >= minYC) {
        return null; // Self-intersects
      }
    }
  }
  
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

const generatePuzzle = (level, shape = SHAPES.SQUARE) => {
  // Base size scales infinitely with level. Each level adds roughly one grid step (35px).
  const size = 500 + level * 35;
  const width = size;
  const height = size;

  
  // We want to pack the shape as tightly as possible, so targetDensity is infinite.
  // The generation stops when it fails to find an empty spot consecutively.
  const targetDensity = 99999; 
  
  // Calculate minimum segments based on a logarithmic scale
  const minSegments = Math.min(
    6,
    Math.ceil(Math.log2(Math.max(level, 5) / 5)) + 1
  );
  
  // Ensure max segments is always at least minSegments, allowing for variation
  const maxSegments = Math.max(minSegments + 1, Math.min(2 + Math.floor(level / 4), 8));
  
  const maskFunc = SHAPE_MASKS[shape] || maskSquare;

  let bestPuzzle = null;
  let bestCount = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    const puzzle = createPuzzle(width, height);
    let idCounter = 1;
    let consecutiveFailures = 0;
    // Higher levels get more attempts to pack the board even tighter
    const maxConsecutiveFailures = Math.min(200 + level * 20, 1000); 

    while (puzzle.objects.length < targetDensity && consecutiveFailures < maxConsecutiveFailures) {
      const candidate = generateCandidatePath(width, height, maskFunc, idCounter, minSegments, maxSegments);
      
      if (!candidate) {
        consecutiveFailures++;
        continue;
      }

      if (doesObjectOverlap(puzzle, candidate)) {
        consecutiveFailures++;
        continue;
      }

      puzzle.objects.push(candidate);
      if (!hasDeadlock(puzzle)) {
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
    
    // If we managed to pack a decent amount, we can stop trying to find a better one
    // We scale the required target aggressively so higher levels always have more pieces
    if (bestCount >= 10 + level * 3) break;
  }

  if (bestPuzzle) {
    bestPuzzle.objects.reverse();
  }
  
  return bestPuzzle;
};

module.exports = { SHAPES, SHAPE_MASKS, generatePuzzle };
