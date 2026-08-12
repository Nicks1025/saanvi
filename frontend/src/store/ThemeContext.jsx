import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'system';
  });

  const [font, setFont] = useState(() => {
    return localStorage.getItem('app-font') || 'sans';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-font', font);
    
    const root = document.documentElement;
    
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }

    root.setAttribute('data-font', font);
  }, [theme, font]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
};
