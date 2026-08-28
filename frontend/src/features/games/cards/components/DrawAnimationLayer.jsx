import React, { useEffect, useState, useRef } from 'react';

const getPlayerCoordinates = (playerId, players) => {
  const localPlayer = players.find((p) => p.isLocal) || players[0];
  if (playerId === localPlayer?.id || playerId === 'p1') {
    return { x: '50%', y: '86%', name: 'You' };
  }
  const opponents = players.filter((p) => !p.isLocal);
  const oppIndex = opponents.findIndex((p) => p.id === playerId);
  const total = opponents.length;
  const opp = opponents[oppIndex] || opponents[0];
  const name = opp?.name || 'Player';

  if (oppIndex === -1 || total === 0) return { x: '50%', y: '12%', name };
  if (total === 1) return { x: '50%', y: '10%', name };
  if (total === 2) {
    const coords = [{ x: '26%', y: '18%' }, { x: '74%', y: '18%' }];
    return { ...(coords[oppIndex] || coords[0]), name };
  }
  if (total === 3) {
    const coords = [{ x: '10%', y: '50%' }, { x: '50%', y: '10%' }, { x: '90%', y: '50%' }];
    return { ...(coords[oppIndex] || coords[0]), name };
  }
  if (total === 4) {
    const coords = [{ x: '11%', y: '65%' }, { x: '26%', y: '16%' }, { x: '74%', y: '16%' }, { x: '89%', y: '65%' }];
    return { ...(coords[oppIndex] || coords[0]), name };
  }
  if (total === 5) {
    const coords = [{ x: '10%', y: '68%' }, { x: '14%', y: '34%' }, { x: '50%', y: '10%' }, { x: '86%', y: '34%' }, { x: '90%', y: '68%' }];
    return { ...(coords[oppIndex] || coords[0]), name };
  }
  if (total === 6) {
    const coords = [{ x: '10%', y: '70%' }, { x: '12%', y: '40%' }, { x: '28%', y: '16%' }, { x: '72%', y: '16%' }, { x: '88%', y: '40%' }, { x: '90%', y: '70%' }];
    return { ...(coords[oppIndex] || coords[0]), name };
  }
  const coords = [{ x: '10%', y: '72%' }, { x: '11%', y: '44%' }, { x: '22%', y: '20%' }, { x: '50%', y: '10%' }, { x: '78%', y: '20%' }, { x: '89%', y: '44%' }, { x: '90%', y: '72%' }];
  return { ...(coords[oppIndex] || coords[0]), name };
};

const pctToPx = (val, total) => {
  if (typeof val === 'string' && val.endsWith('%')) {
    return (parseFloat(val) / 100) * total;
  }
  return parseFloat(val) || 0;
};

export const DrawAnimationLayer = ({ drawAnimation, players = [], arenaRef, tableScale = 0.85 }) => {
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
    const targetPct = getPlayerCoordinates(drawAnimation.playerId, playersRef.current);

    let targetXpx, targetYpx, cards;

    if (arenaRef?.current) {
      const arenaRect = arenaRef.current.getBoundingClientRect();
      const TABLE_W = 960 * tableScale;
      const TABLE_H = 520 * tableScale;
      const tableLeft = arenaRect.left + (arenaRect.width - TABLE_W) / 2;
      const tableTop  = arenaRect.top  + (arenaRect.height - TABLE_H) / 2;

      const txPx = tableLeft + pctToPx(targetPct.x, TABLE_W);
      const tyPx = tableTop  + pctToPx(targetPct.y, TABLE_H);

      // Draw pile: top: 18px, left: 24px inside table + ~40/50px to center on card face
      const originXpx = tableLeft + (24 + 40) * tableScale;
      const originYpx = tableTop  + (18 + 50) * tableScale;

      // Use transform deltas so card is always anchored at pile and slides to player
      const deltaX = txPx - originXpx;
      const deltaY = tyPx - originYpx;

      targetXpx = `${txPx}px`;
      targetYpx = `${tyPx}px`;

      cards = Array.from({ length: count }, (_, idx) => ({
        key: `${flightId}-card-${idx}`,
        staggerDelay: idx * 120,
        originX: `${originXpx}px`,
        originY: `${originYpx}px`,
        deltaX: `${deltaX}px`,
        deltaY: `${deltaY}px`,
      }));
    } else {
      targetXpx = targetPct.x;
      targetYpx = targetPct.y;
      cards = Array.from({ length: count }, (_, idx) => ({
        key: `${flightId}-card-${idx}`,
        staggerDelay: idx * 120,
        originX: '48px',
        originY: '64px',
        deltaX: '0px',
        deltaY: '-120px',
      }));
    }

    setActiveFlights((prev) => [...prev, { id: flightId, cards, count, targetXpx, targetYpx }]);

    const totalDuration = 700 + (count - 1) * 120 + 200;
    const timer = setTimeout(() => {
      setActiveFlights((prev) => prev.filter((f) => f.id !== flightId));
      // NOTE: Do NOT delete from handledFlightIdsRef — drawAnimation stays in state
      // and would re-trigger on re-renders if the ID were removed.
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [drawAnimation, tableScale]);

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
