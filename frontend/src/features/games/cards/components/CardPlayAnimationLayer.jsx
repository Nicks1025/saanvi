import React, { useEffect, useState, useRef } from 'react';
import { GameCard } from './GameCard';

// Player seat positions inside the 960x520 table (as fractions 0-1)
const getSeatPosition = (playerId, players) => {
  const localPlayer = players.find((p) => p.isLocal) || players[0];
  if (!playerId || playerId === localPlayer?.id || playerId === 'p1') {
    return { x: 0.5, y: 0.92 }; // bottom center (local player)
  }
  const opponents = players.filter((p) => !p.isLocal);
  const idx = opponents.findIndex((p) => p.id === playerId);
  const total = opponents.length;

  const maps = {
    1: [[0.5, 0.10]],
    2: [[0.26, 0.18], [0.74, 0.18]],
    3: [[0.10, 0.50], [0.50, 0.10], [0.90, 0.50]],
    4: [[0.11, 0.65], [0.26, 0.16], [0.74, 0.16], [0.89, 0.65]],
    5: [[0.10, 0.68], [0.14, 0.34], [0.50, 0.10], [0.86, 0.34], [0.90, 0.68]],
    6: [[0.10, 0.70], [0.12, 0.40], [0.28, 0.16], [0.72, 0.16], [0.88, 0.40], [0.90, 0.70]],
    7: [[0.10, 0.72], [0.11, 0.44], [0.22, 0.20], [0.50, 0.10], [0.78, 0.20], [0.89, 0.44], [0.90, 0.72]],
  };

  const positions = maps[Math.min(total, 7)] || maps[7];
  const [x, y] = positions[idx] || positions[0];
  return { x, y };
};

export const CardPlayAnimationLayer = ({ cardPlayEvent, players = [], arenaRef, tableScale = 0.85 }) => {
  const [flights, setFlights] = useState([]);
  const handledIdsRef = useRef(new Set());

  const TABLE_W = 960;
  const TABLE_H = 520;
  // Center of the table (discard pile) as fractions
  const CENTER_X = 0.5;
  const CENTER_Y = 0.5;

  useEffect(() => {
    if (!cardPlayEvent || !cardPlayEvent.id) return;
    if (handledIdsRef.current.has(cardPlayEvent.id)) return;
    handledIdsRef.current.add(cardPlayEvent.id);

    if (!arenaRef?.current) return;
    const arenaRect = arenaRef.current.getBoundingClientRect();
    const scaledW = TABLE_W * tableScale;
    const scaledH = TABLE_H * tableScale;
    const tableLeft = arenaRect.left + (arenaRect.width - scaledW) / 2;
    const tableTop  = arenaRect.top  + (arenaRect.height - scaledH) / 2;

    // Compute seat position
    const seat = getSeatPosition(cardPlayEvent.playerId, players);
    const fromX = tableLeft + seat.x * scaledW;
    const fromY = tableTop  + seat.y * scaledH;

    // Compute center (discard pile) position
    const toX = tableLeft + CENTER_X * scaledW;
    const toY = tableTop  + CENTER_Y * scaledH;

    const flightId = cardPlayEvent.id;
    setFlights((prev) => [...prev, { id: flightId, card: cardPlayEvent.card, fromX, fromY, toX, toY }]);

    // Clean up after animation (~800ms)
    const timer = setTimeout(() => {
      setFlights((prev) => prev.filter((f) => f.id !== flightId));
      // NOTE: Do NOT delete from handledIdsRef — cardPlayEvent stays in state
      // and would re-trigger on re-renders if its ID became unblocked.
    }, 900);

    return () => clearTimeout(timer);
  }, [cardPlayEvent, tableScale, players]);

  if (flights.length === 0) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 210, overflow: 'visible' }}
      aria-hidden="true"
    >
      {flights.map((f) => (
        <div
          key={f.id}
          className="card-play-flight"
          style={{
            '--from-x': `${f.fromX}px`,
            '--from-y': `${f.fromY}px`,
            '--to-x':   `${f.toX}px`,
            '--to-y':   `${f.toY}px`,
          }}
        >
          <GameCard card={f.card} size="md" isPlayable={false} />
        </div>
      ))}
    </div>
  );
};

export default CardPlayAnimationLayer;
