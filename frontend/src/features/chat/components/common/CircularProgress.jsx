import React from 'react';
import SIcon from '@/components/common/SIcon';

export const CircularProgress = ({ progress = 0, onCancel, size = 48, strokeWidth = 4, className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className={`circular-progress-container ${className}`}
      style={{ 
        position: 'relative', 
        width: size, 
        height: size, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '50%'
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />
      </svg>
      <SIcon
        name="x"
        size={Math.round(size * 0.45)}
        color="#ffffff"
        onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
        title="Cancel download"
        aria-label="Cancel download"
        style={{ zIndex: 1 }}
      />
    </div>
  );
};
