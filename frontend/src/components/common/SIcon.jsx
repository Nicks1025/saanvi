import React, { forwardRef } from 'react';
import './s-icon.css';
import { ICON_MAP, SIZE_MAP, STANDARD_COLORS } from './s-icon.constants.js';

export { ICON_MAP, SIZE_MAP, STANDARD_COLORS };

const SIcon = forwardRef(({
  name,
  icon,
  size = 'm',
  color,
  subtle = false,
  spin = false,
  className = '',
  style = {},
  onClick,
  title,
  label,
  disabled = false,
  children,
  role,
  tabIndex,
  ...restProps
}, ref) => {
  const iconIdentifier = name || icon;
  const numericSize = typeof size === 'number' ? size : (SIZE_MAP[size] || 16);

  // Resolve color classes vs inline style
  const isNamedColor = STANDARD_COLORS.includes(color);
  const colorClass = isNamedColor ? `s-icon--color-${color}` : '';
  const resolvedStyle = {
    ...(!isNamedColor && color ? { color } : {}),
    ...style
  };

  const isClickable = Boolean(onClick);
  const effectiveAriaLabel = label || title || (typeof iconIdentifier === 'string' ? iconIdentifier : undefined);

  // Render the inner glyph/component
  const renderInner = () => {
    // 1. Direct children passed (e.g. <SIcon><UserPlus size={20} /></SIcon>)
    if (children) {
      if (React.isValidElement(children)) {
        return React.cloneElement(children, {
          size: children.props.size || numericSize,
          ...(children.props.className ? { className: children.props.className } : {})
        });
      }
      return children;
    }

    // 2. React element passed via name/icon prop (e.g. icon={<X size={16} />})
    if (React.isValidElement(iconIdentifier)) {
      return React.cloneElement(iconIdentifier, {
        size: iconIdentifier.props.size || numericSize,
        ...(iconIdentifier.props.className ? { className: iconIdentifier.props.className } : {})
      });
    }

    // 3. React component passed via name/icon prop (e.g. icon={UserPlus})
    if (typeof iconIdentifier === 'function') {
      const Component = iconIdentifier;
      return <Component size={numericSize} />;
    }

    // 4. String identifier lookup from ICON_MAP
    if (typeof iconIdentifier === 'string') {
      const normalizedKey = iconIdentifier.toLowerCase().trim();
      const LucideComponent = ICON_MAP[normalizedKey];

      if (LucideComponent) {
        return <LucideComponent size={numericSize} />;
      }

      // Fallback for emojis or string glyphs (e.g. '⚙️', '✕', '&times;')
      return (
        <span
          style={{
            fontSize: typeof numericSize === 'number' ? `${numericSize}px` : numericSize,
            display: 'inline-block',
            lineHeight: 1
          }}
        >
          {iconIdentifier}
        </span>
      );
    }

    return null;
  };

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) {
      onClick(e);
    }
    if (e?.currentTarget?.dispatchEvent) {
      e.currentTarget.dispatchEvent(
        new CustomEvent('icon-click', {
          bubbles: true,
          detail: { name: iconIdentifier, originalEvent: e }
        })
      );
    }
  };

  const combinedClasses = [
    's-icon',
    isClickable ? 's-icon--clickable' : '',
    subtle ? 's-icon--subtle' : '',
    spin ? 's-icon--spin' : '',
    colorClass,
    disabled ? 's-icon--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <span
      ref={ref}
      className={combinedClasses}
      style={resolvedStyle}
      onClick={isClickable ? handleClick : undefined}
      title={title}
      aria-label={effectiveAriaLabel}
      aria-hidden={!effectiveAriaLabel}
      role={role || (isClickable ? 'button' : undefined)}
      tabIndex={isClickable && !disabled ? (tabIndex ?? 0) : tabIndex}
      {...restProps}
    >
      {renderInner()}
    </span>
  );
});

SIcon.displayName = 'SIcon';

export default SIcon;
