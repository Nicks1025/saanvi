/**
 * chatThemes.js
 *
 * Static configuration for chat background themes.
 * Components must import from here — do NOT define themes inside components.
 */

/** @type {Array<{ id: string, label: string }>} */
export const CHAT_THEMES = [
  { id: 'default',  label: 'Default'  },
  { id: 'soft',     label: 'Soft'     },
  { id: 'warm',     label: 'Warm'     },
  { id: 'cool',     label: 'Cool'     },
  { id: 'nature',   label: 'Nature'   },
  { id: 'minimal',  label: 'Minimal'  },
  { id: 'dark',     label: 'Dark'     },
  { id: 'gradient', label: 'Gradient' },
];
