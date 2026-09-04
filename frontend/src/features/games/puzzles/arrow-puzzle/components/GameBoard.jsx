import React, { useState } from 'react';
import './GameBoard.css';
import { isMoveValid, DIRECTIONS } from '../engine/PuzzleEngine.js';

const STROKE_WIDTH = 5;
const PATH_COLOR = '#0f172a'; // slate-900

const calculatePathLength = (points) => {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.abs(points[i].x - points[i + 1].x) + Math.abs(points[i].y - points[i + 1].y);
  }
  return len;
};

export const GameBoard = ({ puzzle, shape, onObjectTap, onMoveAttempt, hintObjectId }) => {
  const [animatingObjects, setAnimatingObjects] = useState({});

  const handleTap = (obj) => {
    if (animatingObjects[obj.id]) return;

    // Filter out escaping objects so they don't block subsequent taps
    const escapingIds = Object.keys(animatingObjects).filter(id => animatingObjects[id].state === 'ESCAPING');
    const virtualPuzzle = {
      ...puzzle,
      objects: puzzle.objects.filter(o => !escapingIds.includes(o.id))
    };

    const valid = isMoveValid(virtualPuzzle, obj.id);
    if (onMoveAttempt) onMoveAttempt();

    if (valid) {
      setAnimatingObjects((prev) => ({
        ...prev,
        [obj.id]: { state: 'ESCAPING', dir: obj.dir },
      }));
      setTimeout(() => {
        setAnimatingObjects(prev => {
          const next = { ...prev };
          delete next[obj.id];
          return next;
        });
        onObjectTap(obj.id);
      }, 500);
    } else {
      setAnimatingObjects((prev) => ({
        ...prev,
        [obj.id]: { state: 'SHAKING' },
      }));
      setTimeout(() => {
        setAnimatingObjects((prev) => {
          const next = { ...prev };
          delete next[obj.id];
          return next;
        });
      }, 400);
    }
  };

  if (!puzzle) return null;

  return (
    <div className="arrow-puzzle-board-container">
      <svg
        viewBox={`0 0 ${puzzle.width} ${puzzle.height}`}
        className="arrow-puzzle-svg"
      >
        {puzzle.objects.map((obj) => {
          const anim = animatingObjects[obj.id];
          const isEscaping = anim?.state === 'ESCAPING';
          let className = 'puzzle-object';

          if (isEscaping) {
            className += ' escaping';
          } else if (anim?.state === 'SHAKING') {
            className += ' shaking';
          }
          if (hintObjectId === obj.id) {
            className += ' hint-pulse';
          }

          // Calculate lengths and points
          const originalLength = calculatePathLength(obj.points);
          const dist = Math.max(puzzle.width, puzzle.height) + 200;
          const head = obj.points[obj.points.length - 1];
          const dx = DIRECTIONS[obj.dir].dx * dist;
          const dy = DIRECTIONS[obj.dir].dy * dist;
          
          // The body points include the infinite escape ray so it's always ready
          const originalPointsStr = obj.points.map((p) => `${p.x},${p.y}`).join(' ');
          const pointsToRender = [...obj.points, { x: head.x + dx, y: head.y + dy }];
          const pointsStr = pointsToRender.map((p) => `${p.x},${p.y}`).join(' ');

          // Arrowhead positioning
          let arrowRot = 0;
          if (obj.dir === 'RIGHT') arrowRot = 0;
          if (obj.dir === 'DOWN') arrowRot = 90;
          if (obj.dir === 'LEFT') arrowRot = 180;
          if (obj.dir === 'UP') arrowRot = -90;

          // The arrowhead translates along the ray
          const arrowTransform = isEscaping 
            ? `translate(${head.x + dx}px, ${head.y + dy}px) rotate(${arrowRot}deg)`
            : `translate(${head.x}px, ${head.y}px) rotate(${arrowRot}deg)`;

          return (
            <g key={obj.id} className={className} onClick={() => handleTap(obj)}>
              {/* Invisible wide path for easy tapping (only covers the actual physical object) */}
              <polyline
                points={originalPointsStr}
                fill="none"
                stroke="transparent"
                strokeWidth={30}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ cursor: 'pointer' }}
              />
              
              {/* Visible thin snake body */}
              <polyline
                points={pointsStr}
                fill="none"
                stroke={PATH_COLOR}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${originalLength} 10000`}
                strokeDashoffset={isEscaping ? -dist : 0}
                style={{
                  transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: 'none'
                }}
              />

              {/* Arrowhead */}
              <g 
                style={{
                  transform: arrowTransform,
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: 'none'
                }}
              >
                <path d="M -12 -9 L 8 0 L -12 9 L -6 0 z" fill={PATH_COLOR} />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
