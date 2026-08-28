import React from 'react';
import { GameCard } from './GameCard';
import { Flame } from 'lucide-react';

// Predetermined fixed offsets & z-indices for 4-card history
// Slot 0: Newest / Front card (100% visible)
// Slots 1-3: Previous cards stepped left and up with rotation so their colors, numbers, and action symbols are clearly readable
const STACK_SLOT_OFFSETS = [
  { rotate: '0deg', x: '0px', y: '0px', zIndex: 10, isTop: true },      // Slot 0: Newest / Top card
  { rotate: '-3deg', x: '-24px', y: '-8px', zIndex: 8, isTop: false },  // Slot 1: 1 throw ago
  { rotate: '-6deg', x: '-48px', y: '-16px', zIndex: 6, isTop: false }, // Slot 2: 2 throws ago
  { rotate: '-9deg', x: '-72px', y: '-24px', zIndex: 4, isTop: false }, // Slot 3: 3 throws ago
];

export const CenterTable = ({
  topCard,
  discardPile = [],
  activeStack = 0,
}) => {
  // Up to latest 4 thrown cards ordered NEWEST FIRST (idx 0 is newest/top, idx 1 is prev, etc.)
  const renderedCards = React.useMemo(() => {
    if (discardPile && discardPile.length > 0) {
      return [...discardPile.slice(-4)].reverse();
    }
    return topCard ? [topCard] : [];
  }, [discardPile, topCard]);

  return (
    <div className="center-table-zone" id="center-table-zone">
      {/* THROWN / DISCARD STACK (Strictly Fixed Dimensions, 4 Visible Cards, Zero Layout Jumps) */}
      <div className="discard-stack-wrapper">
        {renderedCards.length > 0 ? (
          <div className="discard-stack-area">
            {renderedCards.map((card, idx) => {
              const slot = STACK_SLOT_OFFSETS[idx] || STACK_SLOT_OFFSETS[0];

              return (
                <div
                  key={card.id || `discard-slot-${idx}`}
                  className={`discard-stacked-card ${slot.isTop ? 'discard-top-card' : 'discard-under-card'}`}
                  style={{
                    transform: `translate(${slot.x}, ${slot.y}) rotate(${slot.rotate})`,
                    zIndex: slot.zIndex,
                  }}
                >
                  <GameCard
                    card={card}
                    size="table"
                    isPlayable={false}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-discard-slot">Empty Pile</div>
        )}
      </div>

      {/* Stacking Penalty Badge */}
      {activeStack > 0 && (
        <div className="active-stack-badge animate-pulse">
          <Flame size={16} className="flame-icon text-amber-500" />
          <span>Active Stack: <strong>+{activeStack} Cards</strong></span>
        </div>
      )}

    </div>
  );
};

export default CenterTable;
