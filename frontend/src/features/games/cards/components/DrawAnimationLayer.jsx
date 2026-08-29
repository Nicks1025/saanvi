import React, { useEffect, useState, useRef } from 'react';

const getDeckCoordinates = () => {
  const deck = document.getElementById('saanvi-top-left-draw-pile');
  if (deck) {
    const rect = deck.getBoundingClientRect();
    // Aim for the visual center of the top card layer
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 + 10 };
  }
  return { x: 48, y: 64 };
};

const getTargetCoordinates = (playerId, players) => {
  const localPlayer = players.find(p => p.isLocal) || players[0];
  
  if (playerId === localPlayer?.id || playerId === 'p1') {
    const hand = document.getElementById('local-player-hand');
    if (hand) {
      const rect = hand.getBoundingClientRect();
      // Target the upper part of the hand fan
      return { x: rect.left + rect.width / 2, y: rect.top + 30 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 100 };
  }

  // Opponent seat
  const seat = document.getElementById(`player-seat-${playerId}`);
  if (seat) {
    const rect = seat.getBoundingClientRect();
    // Center of the avatar
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

export const DrawAnimationLayer = ({ drawAnimation, players = [] }) => {
  const [activeFlights, setActiveFlights] = useState([]);
  const handledFlightIdsRef = useRef(new Set());
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    if (!drawAnimation || !drawAnimation.id) return;
    if (handledFlightIdsRef.current.has(drawAnimation.id)) return;
    if (drawAnimation.type && drawAnimation.type !== 'CARD_DRAWN') return;

    const flightId = drawAnimation.id;
    handledFlightIdsRef.current.add(flightId);

    const count = Math.max(1, Math.min(drawAnimation.count || 1, 8));
    
    // Calculate exact pixel coordinates dynamically
    const origin = getDeckCoordinates();
    const target = getTargetCoordinates(drawAnimation.playerId, playersRef.current);

    const deltaX = target.x - origin.x;
    const deltaY = target.y - origin.y;

    const cards = Array.from({ length: count }, (_, idx) => ({
      key: `${flightId}-card-${idx}`,
      staggerDelay: idx * 120,
      originX: `${origin.x}px`,
      originY: `${origin.y}px`,
      deltaX: `${deltaX}px`,
      deltaY: `${deltaY}px`,
    }));

    setActiveFlights((prev) => [...prev, { 
      id: flightId, 
      cards, 
      count, 
      targetXpx: `${target.x}px`, 
      targetYpx: `${target.y}px` 
    }]);

    const totalDuration = 700 + (count - 1) * 120 + 200;
    const timer = setTimeout(() => {
      setActiveFlights((prev) => prev.filter((f) => f.id !== flightId));
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [drawAnimation]);

  if (activeFlights.length === 0) return null;

  return (
    <div className="draw-animation-overlay-layer" aria-hidden="true">
      {activeFlights.map((flight) => (
        <React.Fragment key={flight.id}>
          {flight.cards.map((c) => (
            <div
              key={c.key}
              className="draw-flying-card"
              style={{
                '--origin-x': c.originX,
                '--origin-y': c.originY,
                '--delta-x':  c.deltaX,
                '--delta-y':  c.deltaY,
                animationDelay: `${c.staggerDelay}ms`,
              }}
            >
              <div className="flying-card-face-down">
                <div className="flying-card-pattern">
                  <div className="flying-card-emblem">
                    <span className="flying-card-letter">U</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            className="draw-flying-counter-badge animate-scaleUp"
            style={{
              position: 'fixed',
              left: flight.targetXpx,
              top: flight.targetYpx,
              transform: 'translate(-50%, -140%)',
              zIndex: 60,
            }}
          >
            <span>+{flight.count}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default DrawAnimationLayer;
