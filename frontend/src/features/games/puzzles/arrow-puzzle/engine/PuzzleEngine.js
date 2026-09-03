export const THICKNESS = 16; // Logical bounding box thickness (visual stroke will be thinner, e.g. 6px or 8px)

export const DIRECTIONS = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
};

/**
 * Creates an empty puzzle board with a specified continuous logical area.
 */
export const createPuzzle = (width, height) => ({
  width,   // e.g. 1000
  height,  // e.g. 1000
  objects: [], // Array of { id, dir: 'UP'|'DOWN'|'LEFT'|'RIGHT', points: [{x,y}], color: string }
});

/**
 * Gets the Axis-Aligned Bounding Box for a single line segment.
 */
export const getSegmentAABB = (p1, p2) => {
  return {
    minX: Math.min(p1.x, p2.x) - THICKNESS / 2,
    maxX: Math.max(p1.x, p2.x) + THICKNESS / 2,
    minY: Math.min(p1.y, p2.y) - THICKNESS / 2,
    maxY: Math.max(p1.y, p2.y) + THICKNESS / 2,
  };
};

/**
 * Checks if two static AABBs intersect.
 */
export const aabbIntersect = (A, B) => {
  return (
    A.minX < B.maxX &&
    A.maxX > B.minX &&
    A.minY < B.maxY &&
    A.maxY > B.minY
  );
};

/**
 * Checks if AABB 'A' moving infinitely in 'dir' will intersect stationary AABB 'B'.
 */
export const sweptAABBHit = (A, B, dir) => {
  const overlapX = A.minX < B.maxX && A.maxX > B.minX;
  const overlapY = A.minY < B.maxY && A.maxY > B.minY;

  // We use exclusive strict inequalities because touching bounds shouldn't necessarily block if we want tight packing,
  // but since we add THICKNESS/2 padding, strict overlap ensures physical gap.
  if (dir === 'RIGHT') return overlapY && B.maxX > A.minX;
  if (dir === 'LEFT') return overlapY && B.minX < A.maxX;
  if (dir === 'DOWN') return overlapX && B.maxY > A.minY;
  if (dir === 'UP') return overlapX && B.minY < A.maxY;
  return false;
};

/**
 * Gets all AABBs for an object's path.
 */
export const getObjectAABBs = (obj) => {
  const aabbs = [];
  for (let i = 0; i < obj.points.length - 1; i++) {
    aabbs.push(getSegmentAABB(obj.points[i], obj.points[i + 1]));
  }
  return aabbs;
};

/**
 * Checks if a candidate object overlaps with any existing objects in the puzzle.
 */
export const doesObjectOverlap = (puzzle, candidateObj) => {
  const candidateAABBs = getObjectAABBs(candidateObj);
  
  for (const obj of puzzle.objects) {
    if (obj.id === candidateObj.id) continue;
    const objAABBs = getObjectAABBs(obj);
    for (const ca of candidateAABBs) {
      for (const oa of objAABBs) {
        if (aabbIntersect(ca, oa)) return true;
      }
    }
  }
  return false;
};

/**
 * Checks if an object can move off the board in its designated direction without hitting OTHER objects.
 */
export const isMoveValid = (puzzle, objectId) => {
  const obj = puzzle.objects.find((o) => o.id === objectId);
  if (!obj) return false;

  const headPoint = obj.points[obj.points.length - 1];
  
  const headAABB = {
    minX: headPoint.x - THICKNESS / 2,
    maxX: headPoint.x + THICKNESS / 2,
    minY: headPoint.y - THICKNESS / 2,
    maxY: headPoint.y + THICKNESS / 2,
  };

  for (const other of puzzle.objects) {
    if (other.id === objectId) continue;
    const otherAABBs = getObjectAABBs(other);

    // Only the head's swept area needs to be clear for the snake to move forward
    for (const sa of otherAABBs) {
      if (sweptAABBHit(headAABB, sa, obj.dir)) {
        return false;
      }
    }
  }

  return true; // Unblocked by all other objects
};

export const getAvailableMoves = (puzzle) => {
  return puzzle.objects.filter((obj) => isMoveValid(puzzle, obj.id));
};

export const applyMove = (puzzle, objectId) => {
  return {
    ...puzzle,
    objects: puzzle.objects.filter((o) => o.id !== objectId),
  };
};

export const isPuzzleSolved = (puzzle) => {
  return puzzle.objects.length === 0;
};
