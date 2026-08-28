import React from 'react';
import { GameCard } from './GameCard';
import { Layers } from 'lucide-react';

export const PlayerHand = ({
  cards = [],
  playableCardIds = [],
  selectedCardId = null,
  onCardClick,
  onDrawCard,
  isMyTurn = false,
  hasCalledUno = false,
  activeStack = 0,
}) => {
  const totalCards = cards.length;

  // Calculate fan angle and horizontal overlap dynamically so hand never overflows or scrolls
  const calculateCardStyle = (index, total) => {
    if (total <= 1) {
      return {
        transform: 'translateY(0px) rotate(0deg)',
        zIndex: 1,
      };
    }

    // Dynamic rotation spread based on number of cards
    const maxSpreadAngle = Math.min(22, Math.max(5, total * 1.8));
    const angleStep = maxSpreadAngle / (total - 1);
    const currentAngle = -maxSpreadAngle / 2 + index * angleStep;

    // Gentle vertical arc displacement
    const normalizedIndex = (index - (total - 1) / 2) / ((total - 1) / 2 || 1);
    const yDisplacement = Math.abs(normalizedIndex) * (total > 10 ? 8 : 5);

    // Overlap margin smoothly calculated so hands of any size fit comfortably inside viewport
    let overlapMargin = -12;
    if (total > 18) {
      overlapMargin = -52;
    } else if (total > 14) {
      overlapMargin = -46;
    } else if (total > 10) {
      overlapMargin = -38;
    } else if (total > 7) {
      overlapMargin = -28;
    } else if (total > 4) {
      overlapMargin = -18;
    }

    return {
      transform: `translateY(${yDisplacement}px) rotate(${currentAngle}deg)`,
      marginLeft: index === 0 ? '0px' : `${overlapMargin}px`,
      zIndex: index + 2,
    };
  };

  const hasStatusBar = isMyTurn || activeStack > 0 || (totalCards === 1 && hasCalledUno);

  return (
    <div className="player-hand-container" id="local-player-hand">
      {/* Hand Status & Actions Bar (Rendered only when active) */}
      {hasStatusBar && (
        <div className="hand-status-bar">
          {/* Dedicated Player Draw Action Button - Rendered ONLY during local player's turn */}
          {isMyTurn && (
            <button
              className="hand-draw-btn can-draw animate-scaleUp"
              onClick={onDrawCard}
              title={
                activeStack > 0
                  ? `Draw +${activeStack} penalty cards`
                  : 'Draw 1 card from deck'
              }
            >
              <Layers size={13} />
              <span>{activeStack > 0 ? `Draw +${activeStack}` : 'Draw Card'}</span>
            </button>
          )}

          {activeStack > 0 && (
            <div className="stack-warning-pill animate-bounce">
              <span>Stack Active: +{activeStack}</span>
            </div>
          )}

          {totalCards === 1 && hasCalledUno && (
            <div className="uno-shield-pill">
              <span>★ UNO SAFE</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Hand Fan (Strictly No Scrolling) */}
      <div className="hand-scroll-wrapper">
        <div className={`hand-cards-fan cards-count-${totalCards}`}>
          {cards.map((card, index) => {
            const isPlayable = isMyTurn && playableCardIds.includes(card.id);
            const isSelected = selectedCardId === card.id;
            const fanStyle = calculateCardStyle(index, totalCards);

            return (
              <div
                key={card.id}
                className={`fan-card-slot ${isPlayable ? 'slot-playable' : 'slot-unplayable'} ${isSelected ? 'slot-selected' : ''}`}
                style={fanStyle}
              >
                <GameCard
                  card={card}
                  isPlayable={isPlayable}
                  isSelected={isSelected}
                  size="hand"
                  onClick={() => {
                    if (isPlayable && onCardClick) {
                      onCardClick(card, isPlayable);
                    }
                  }}
                  showAura={isPlayable}
                  animationDelay={index * 20}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayerHand;
