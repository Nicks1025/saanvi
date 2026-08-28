import React from 'react';
import { Layers } from 'lucide-react';

export const DrawPile = ({
  drawPileCount = 0,
  isMyTurn = false,
  onDrawCard,
  activeStack = 0,
}) => {
  const isEmpty = drawPileCount <= 0;

  const handleClick = () => {
    if (isMyTurn && onDrawCard && !isEmpty) {
      onDrawCard();
    }
  };

  return (
    <div
      className={`draw-pile-top-left ${isMyTurn && !isEmpty ? 'is-drawable' : ''} ${isEmpty ? 'is-empty' : ''}`}
      id="saanvi-top-left-draw-pile"
      onClick={handleClick}
      role={isMyTurn && !isEmpty ? 'button' : 'region'}
      tabIndex={isMyTurn && !isEmpty ? 0 : -1}
      title={
        isEmpty
          ? 'Draw pile is empty'
          : isMyTurn
          ? activeStack > 0
            ? `Your turn: Click to draw +${activeStack} penalty cards`
            : 'Your turn: Click to draw 1 card'
          : `Draw Pile: ${drawPileCount} cards remaining`
      }
      aria-label={`Draw Pile: ${drawPileCount} cards`}
    >
      {/* 3D Stacked Card Visuals */}
      <div className="draw-pile-stack-box">
        {!isEmpty ? (
          <>
            {/* Background layered card 3 (deepest) */}
            {drawPileCount >= 3 && (
              <div className="draw-pile-card-layer layer-deep" />
            )}
            {/* Background layered card 2 (middle) */}
            {drawPileCount >= 2 && (
              <div className="draw-pile-card-layer layer-mid" />
            )}
            {/* Top active face-down card */}
            <div className="draw-pile-card-layer layer-top">
              <div className="draw-card-back">
                <div className="draw-card-inner-pattern">
                  <div className="draw-card-emblem">
                    <span className="draw-card-letter">U</span>
                    <span className="draw-card-sub">UNO</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="draw-pile-empty-slot">
            <Layers size={20} className="text-gray-500 opacity-60" />
          </div>
        )}

        {/* Turn Glow / Clickable Ripple Indicator */}
        {isMyTurn && !isEmpty && (
          <div className="draw-pile-turn-ring" />
        )}
      </div>

      {/* Authoritative Card Count Label */}
      <div className="draw-pile-info-tag">
        <span className="draw-pile-count-number">{drawPileCount}</span>
        <span className="draw-pile-count-label">
          {drawPileCount === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* Interactive Turn Prompt Tooltip (Only visible when it's local player's turn) */}
      {isMyTurn && !isEmpty && (
        <div className="draw-pile-action-hint animate-bounce">
          <span>{activeStack > 0 ? `+${activeStack}` : 'DRAW'}</span>
        </div>
      )}
    </div>
  );
};

export default DrawPile;
