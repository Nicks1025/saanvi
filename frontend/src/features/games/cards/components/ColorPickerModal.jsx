import React from 'react';
import { CARD_COLORS, COLOR_METADATA } from '../types';

export const ColorPickerModal = ({ isOpen, onSelectColor }) => {
  if (!isOpen) return null;

  const selectableColors = [
    CARD_COLORS.RED,
    CARD_COLORS.YELLOW,
    CARD_COLORS.GREEN,
    CARD_COLORS.BLUE,
  ];

  return (
    <div className="compact-color-picker-portal animate-scaleUp" id="wild-color-picker">
      <div className="compact-color-picker-box">
        <h4 className="compact-color-picker-title">Choose a Color</h4>
        <div className="compact-color-buttons-row">
          {selectableColors.map((color) => {
            const meta = COLOR_METADATA[color];
            return (
              <button
                key={color}
                className={`compact-color-btn color-btn-${color}`}
                onClick={() => onSelectColor(color)}
                style={{
                  backgroundColor: meta.hex,
                }}
                title={`Select ${meta.name}`}
                aria-label={`Select ${meta.name}`}
              >
                <span className="compact-color-dot" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ColorPickerModal;
