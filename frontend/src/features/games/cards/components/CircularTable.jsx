import React from 'react';
import PlayerSeat from './PlayerSeat';
import CenterTable from './CenterTable';

export const CircularTable = ({
  players = [],
  currentTurnPlayerId,
  topCard,
  discardPile = [],
  activeColor,
  drawPileCount,
  onDrawCard,
  isMyTurn,
  lastPlayedBy,
  direction,
  activeStack,
  onCatchUno,
  onToggleMute,
  turnTimeLeft,
  tableScale = 0.85,
  tableConfig = { w: 960, h: 520 },
}) => {
  const localPlayer = players.find((p) => p.isLocal) || players[0];
  const opponents = players.filter((p) => !p.isLocal);
  const totalOpponents = opponents.length; // 1 to 7

  // Calculate elliptical percentage coordinates (x%, y%) for N opponents along upper/side arc
  const getOpponentPositionStyle = (index, total) => {
    if (total === 1) {
      // 2 players: 1 opponent directly opposite (top center)
      return { top: '8%', left: '50%', transform: 'translate(-50%, -50%)', pos: 'top' };
    }

    if (total === 2) {
      // 3 players: top-left and top-right
      const positions = [
        { top: '16%', left: '24%', transform: 'translate(-50%, -50%)', pos: 'top-left' },
        { top: '16%', left: '76%', transform: 'translate(-50%, -50%)', pos: 'top-right' },
      ];
      return positions[index];
    }

    if (total === 3) {
      // 4 players: left, top, right
      const positions = [
        { top: '50%', left: '8%', transform: 'translate(-50%, -50%)', pos: 'left' },
        { top: '8%', left: '50%', transform: 'translate(-50%, -50%)', pos: 'top' },
        { top: '50%', left: '92%', transform: 'translate(-50%, -50%)', pos: 'right' },
      ];
      return positions[index];
    }

    if (total === 4) {
      // 5 players: bottom-left, top-left, top-right, bottom-right
      const positions = [
        { top: '65%', left: '9%', transform: 'translate(-50%, -50%)', pos: 'bottom-left' },
        { top: '15%', left: '25%', transform: 'translate(-50%, -50%)', pos: 'top-left' },
        { top: '15%', left: '75%', transform: 'translate(-50%, -50%)', pos: 'top-right' },
        { top: '65%', left: '91%', transform: 'translate(-50%, -50%)', pos: 'bottom-right' },
      ];
      return positions[index];
    }

    if (total === 5) {
      // 6 players: bottom-left, mid-left, top, mid-right, bottom-right
      const positions = [
        { top: '68%', left: '8%', transform: 'translate(-50%, -50%)', pos: 'bottom-left' },
        { top: '34%', left: '12%', transform: 'translate(-50%, -50%)', pos: 'left' },
        { top: '8%', left: '50%', transform: 'translate(-50%, -50%)', pos: 'top' },
        { top: '34%', left: '88%', transform: 'translate(-50%, -50%)', pos: 'right' },
        { top: '68%', left: '92%', transform: 'translate(-50%, -50%)', pos: 'bottom-right' },
      ];
      return positions[index];
    }

    if (total === 6) {
      // 7 players
      const positions = [
        { top: '70%', left: '8%', transform: 'translate(-50%, -50%)', pos: 'bottom-left' },
        { top: '40%', left: '10%', transform: 'translate(-50%, -50%)', pos: 'left' },
        { top: '14%', left: '28%', transform: 'translate(-50%, -50%)', pos: 'top-left' },
        { top: '14%', left: '72%', transform: 'translate(-50%, -50%)', pos: 'top-right' },
        { top: '40%', left: '90%', transform: 'translate(-50%, -50%)', pos: 'right' },
        { top: '70%', left: '92%', transform: 'translate(-50%, -50%)', pos: 'bottom-right' },
      ];
      return positions[index];
    }

    // 8 players (7 opponents): full circular ellipse
    const positions = [
      { top: '72%', left: '8%', transform: 'translate(-50%, -50%)', pos: 'bottom-left' },
      { top: '44%', left: '9%', transform: 'translate(-50%, -50%)', pos: 'left' },
      { top: '18%', left: '22%', transform: 'translate(-50%, -50%)', pos: 'top-left' },
      { top: '8%', left: '50%', transform: 'translate(-50%, -50%)', pos: 'top' },
      { top: '18%', left: '78%', transform: 'translate(-50%, -50%)', pos: 'top-right' },
      { top: '44%', left: '91%', transform: 'translate(-50%, -50%)', pos: 'right' },
      { top: '72%', left: '92%', transform: 'translate(-50%, -50%)', pos: 'bottom-right' },
    ];
    return positions[index] || positions[0];
  };

  return (
    <div
      className="circular-table-container"
      id="saanvi-circular-table"
      style={{ zoom: tableScale, width: `${tableConfig.w}px`, height: `${tableConfig.h}px` }}
    >
      {/* Table Felt Surface with Active Color border/glow */}
      <div className={`table-felt-mat active-color-${activeColor}`}>
        {/* Table Inner Ring with Active Color accent */}
        <div className={`felt-inner-ring active-ring-${activeColor}`} />

        {/* Central Circular Border / Active Color Ring directly around center gameplay area */}
        <div className={`center-table-ring active-ring-${activeColor}`} />

        {/* Center Game Zone - Discard Pile Only */}
        <CenterTable
          topCard={topCard}
          discardPile={discardPile}
          activeStack={activeStack}
        />

        {/* Opponent Seats Distributed in Circular Perimeter */}
        {opponents.map((opponent, index) => {
          const posStyle = getOpponentPositionStyle(index, totalOpponents);
          const isTurn = currentTurnPlayerId === opponent.id;

          return (
            <div
              key={opponent.id}
              className="table-seat-slot"
              style={{
                position: 'absolute',
                top: posStyle.top,
                left: posStyle.left,
                transform: posStyle.transform,
                zIndex: 10,
              }}
            >
              <PlayerSeat
                player={opponent}
                isCurrentTurn={isTurn}
                turnTimeLeft={isTurn ? turnTimeLeft : null}
                onCatchUno={onCatchUno}
                onToggleMute={onToggleMute}
                position={posStyle.pos}
                compact={totalOpponents >= 5}
              />
            </div>
          );
        })}

        {/* Local Player Floating Indicator at bottom table rim */}
        {localPlayer && (
          <div
            className="table-seat-slot local-table-slot"
            style={{
              position: 'absolute',
              bottom: '2%',
              left: '50%',
              transform: 'translate(-50%, 0)',
              zIndex: 15,
            }}
          >
            <PlayerSeat
              player={localPlayer}
              isCurrentTurn={currentTurnPlayerId === localPlayer.id}
              turnTimeLeft={currentTurnPlayerId === localPlayer.id ? turnTimeLeft : null}
              onToggleMute={onToggleMute}
              position="bottom"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularTable;
