"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

/** Apply a theme/font to the DOM without persisting to localStorage */
function applyTheme(theme, font) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  if (font) root.setAttribute('data-font', font);
}

export const ThemeProvider = ({ children }) => {
  // Load the last *saved* value from localStorage as the initial state
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-theme') || 'birthday';
    }
    return 'birthday';
  });

  const [font, setFontState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-font') || 'inter';
    }
    return 'inter';
  });

  // Apply theme to DOM whenever state changes (preview — no localStorage write)
  useEffect(() => {
    applyTheme(theme, font);
  }, [theme, font]);

  // Issue 2 fix: sync state when AuthContext fires 'app-theme-sync' event (same-tab)
  useEffect(() => {
    const onThemeSync = (e) => {
      const { theme: newTheme, font: newFont } = e.detail || {};
      if (newTheme) setThemeState(newTheme);
      if (newFont) setFontState(newFont);
    };
    window.addEventListener('app-theme-sync', onThemeSync);
    return () => window.removeEventListener('app-theme-sync', onThemeSync);
  }, []);

  // Issue 3 fix: setTheme only previews (no localStorage write); use persistTheme to save
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    // intentionally NOT writing to localStorage here
  }, []);

  const setFont = useCallback((newFont) => {
    setFontState(newFont);
    // intentionally NOT writing to localStorage here
  }, []);

  /** Call this on explicit Save to persist to localStorage */
  const persistTheme = useCallback((newTheme, newFont) => {
    if (newTheme !== undefined) {
      localStorage.setItem('app-theme', newTheme);
      setThemeState(newTheme);
    }
    if (newFont !== undefined) {
      localStorage.setItem('app-font', newFont);
      setFontState(newFont);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont, persistTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
