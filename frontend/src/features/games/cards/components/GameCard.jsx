import React from 'react';
import { CARD_COLORS, CARD_TYPES, COLOR_METADATA } from '../types';

export const GameCard = ({
  card,
  isPlayable = false,
  isSelected = false,
  isFaceDown = false,
  isHovered = false,
  size = 'hand', // 'sm' | 'md' | 'lg' | 'hand' | 'table' | 'mini'
  onClick,
  style = {},
  className = '',
  showAura = false,
  animationDelay = 0,
}) => {
  if (isFaceDown || !card) {
    return (
      <div
        className={`saanvi-card card-face-down card-size-${size} ${className}`}
        style={style}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label="Face down card"
      >
        <div className="card-inner">
          <div className="card-back-pattern">
            <div className="card-back-emblem">
              <span className="card-back-letter">S</span>
              <span className="card-back-sub">CARDS</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { color, type, label, value } = card;
  const displayLabel = label || value;
  const colorMeta = COLOR_METADATA[color] || COLOR_METADATA[CARD_COLORS.WILD];
  const isWild = color === CARD_COLORS.WILD;

  const renderCardSymbol = () => {
    switch (type) {
      case CARD_TYPES.SKIP:
        return (
          <div className="symbol-action symbol-skip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
        );
      case CARD_TYPES.REVERSE:
        return (
          <div className="symbol-action symbol-reverse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v-2a4 4 0 0 1 4-4h12" />
              <polyline points="16 2 20 6 16 10" />
              <path d="M20 12v2a4 4 0 0 1-4 4H4" />
              <polyline points="8 22 4 18 8 14" />
            </svg>
          </div>
        );
      case CARD_TYPES.DRAW_TWO:
        return (
          <div className="symbol-action symbol-draw-two">
            <span className="symbol-text">+2</span>
          </div>
        );
      case CARD_TYPES.WILD:
        return (
          <div className="symbol-wild-gem">
            <div className="wild-quadrant wild-red" />
            <div className="wild-quadrant wild-blue" />
            <div className="wild-quadrant wild-green" />
            <div className="wild-quadrant wild-yellow" />
            <div className="wild-center-star">✦</div>
          </div>
        );
      case CARD_TYPES.WILD_DRAW_FOUR:
        return (
          <div className="symbol-wild-four">
            <div className="wild-quadrant wild-red" />
            <div className="wild-quadrant wild-blue" />
            <div className="wild-quadrant wild-green" />
            <div className="wild-quadrant wild-yellow" />
            <span className="wild-four-text">+4</span>
          </div>
        );
      case CARD_TYPES.NUMBER:
      default:
        return (
          <div className="symbol-number">
            <span className="symbol-number-text">{displayLabel}</span>
          </div>
        );
    }
  };

  const cornerLabel = () => {
    switch (type) {
      case CARD_TYPES.SKIP:
        return '⊘';
      case CARD_TYPES.REVERSE:
        return '⇄';
      case CARD_TYPES.DRAW_TWO:
        return '+2';
      case CARD_TYPES.WILD:
        return '✦';
      case CARD_TYPES.WILD_DRAW_FOUR:
        return '+4';
      default:
        return displayLabel;
    }
  };

  const cardClasses = [
    'saanvi-card',
    `card-color-${color}`,
    `card-type-${type}`,
    `card-size-${size}`,
    isPlayable ? 'is-playable' : 'is-unplayable',
    isSelected ? 'is-selected' : '',
    isHovered ? 'is-hovered' : '',
    showAura ? 'has-aura' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleCardClick = (e) => {
    if (!isPlayable && !isFaceDown) {
      e?.stopPropagation?.();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={cardClasses}
      style={{
        ...style,
        animationDelay: `${animationDelay}ms`,
      }}
      onClick={handleCardClick}
      role="button"
      tabIndex={isPlayable || isFaceDown ? 0 : -1}
      aria-label={`${colorMeta.name} ${displayLabel || type} card${isPlayable ? ' (playable)' : ''}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && (isPlayable || isFaceDown)) {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
    >
      <div className="card-outer-frame">
        {/* Top-Left Corner Index */}
        <div className="card-corner corner-top-left">
          <span className="corner-val">{cornerLabel()}</span>
          {isWild ? (
            <span className="corner-pip wild-pip">✦</span>
          ) : (
            <span className={`corner-pip color-pip-${color}`} />
          )}
        </div>

        {/* Center Card Field */}
        <div className="card-center-oval">
          {renderCardSymbol()}
        </div>

        {/* Bottom-Right Corner Index (Inverted) */}
        <div className="card-corner corner-bottom-right">
          <span className="corner-val">{cornerLabel()}</span>
          {isWild ? (
            <span className="corner-pip wild-pip">✦</span>
          ) : (
            <span className={`corner-pip color-pip-${color}`} />
          )}
        </div>

        {/* Playable Pulse Indicator */}
        {isPlayable && <div className="playable-indicator" />}
      </div>
    </div>
  );
};

export default GameCard;
