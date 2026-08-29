import React, { useEffect, useState, useRef } from 'react';
import { GameCard } from './GameCard';

const getSourceCoordinates = (playerId, players) => {
  const localPlayer = players.find((p) => p.isLocal) || players[0];
  
  if (!playerId || playerId === localPlayer?.id || playerId === 'p1') {
    const hand = document.getElementById('local-player-hand');
    if (hand) {
      const rect = hand.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + 30 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 100 };
  }

  const seat = document.getElementById(`player-seat-${playerId}`);
  if (seat) {
    const rect = seat.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

const getDiscardPileCoordinates = () => {
  // Center of the table area
  const arena = document.getElementById('saanvi-circular-table');
  if (arena) {
    const rect = arena.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

export const CardPlayAnimationLayer = ({ cardPlayEvent, players = [] }) => {
  const [flights, setFlights] = useState([]);
  const handledIdsRef = useRef(new Set());

  useEffect(() => {
    if (!cardPlayEvent || !cardPlayEvent.id) return;
    if (handledIdsRef.current.has(cardPlayEvent.id)) return;
    handledIdsRef.current.add(cardPlayEvent.id);

    const source = getSourceCoordinates(cardPlayEvent.playerId, players);
    const target = getDiscardPileCoordinates();

    const flightId = cardPlayEvent.id;
    setFlights((prev) => [...prev, { 
      id: flightId, 
      card: cardPlayEvent.card, 
      fromX: source.x, 
      fromY: source.y, 
      toX: target.x, 
      toY: target.y 
    }]);

    const timer = setTimeout(() => {
      setFlights((prev) => prev.filter((f) => f.id !== flightId));
    }, 900);

    return () => clearTimeout(timer);
  }, [cardPlayEvent, players]);

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
