import React from 'react';
import { 
  Plus, UserPlus, X, Save, Pencil, Trash2, 
  Archive, RefreshCw, ArrowLeft, Send, MoreVertical, 
  ZoomIn, ZoomOut, Check, Play, Download, Pause,
  Lightbulb, Trophy, HelpCircle, CheckCircle2, Copy
} from 'lucide-react';

const ICON_MAP = {
  'add': Plus,
  'add-user': UserPlus,
  'close': X,
  'save': Save,
  'edit': Pencil,
  'delete': Trash2,
  'archive': Archive,
  'restore': RefreshCw,
  'back': ArrowLeft,
  'send': Send,
  'more': MoreVertical,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'check': Check,
  'play': Play,
  'pause': Pause,
  'download': Download,
  'hint': Lightbulb,
  'trophy': Trophy,
  'help': HelpCircle,
  'check-circle': CheckCircle2,
  'copy': Copy
};

const SIZE_MAP = {
  'xs': 12,
  's': 14,
  'm': 16,
  'l': 20,
  'xl': 24
};

const SButton = ({ size = 'm', color = 'primary', text, label, children, icon, className = '', loading = false, disabled, ...props }) => {
  const sizeClass = `btn-${size}`; // e.g., btn-xs, btn-s, btn-m, btn-xl
  const colorClass = `btn-${color}`;

  const renderContent = () => {
    const content = children || text || label;
    if (icon && content) {
      return <span className="sdt-action-text">{content}</span>;
    }
    return content;
  };

  const renderIcon = () => {
    if (!icon) return null;
    
    // If a React node (e.g. <Plus size={16} />) was explicitly passed, render it for backward compatibility
    if (typeof icon !== 'string') {
      return <span className="s-button-icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: (children || text || label) ? '0.5rem' : '0' }}>{icon}</span>;
    }

    const IconComponent = ICON_MAP[icon];
    if (!IconComponent) return null;

    const iconSize = SIZE_MAP[size] || 16;
    return (
      <span className="s-button-icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: (children || text || label) ? '0.5rem' : '0' }}>
        <IconComponent size={iconSize} />
      </span>
    );
  };

  return (
    <button 
      className={`s-button ${sizeClass} ${colorClass} ${className}`.trim()} 
      aria-label={label || text || 'button'} 
      disabled={disabled || loading}
      {...props}
    >
      {renderIcon()}
      {renderContent()}
    </button>
  );
};

export default SButton;
