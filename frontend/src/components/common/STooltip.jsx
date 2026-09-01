import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import './s-tooltip.css';

const STooltip = ({ 
  content, 
  children, 
  position = 'top', // top, bottom, left, right
  delay = 200,
  maxWidth = 300,
  iconSize = 16
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="s-tooltip-container"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children ? children : <Info size={iconSize} style={{ color: 'var(--accent)', cursor: 'pointer' }} />}
      {isVisible && (
        <div className={`s-tooltip-content s-tooltip-${position}`} style={{ maxWidth: `${maxWidth}px` }}>
          {content}
        </div>
      )}
    </div>
  );
};

export default STooltip;
