import React, { createContext, useContext } from 'react';
import { useTheme } from '@/store/ThemeContext';

const BirthdayThemeContext = createContext();

export const useBirthdayTheme = () => {
  return useContext(BirthdayThemeContext);
};

export const BirthdayThemeProvider = ({ children }) => {
  const { theme } = useTheme();
  
  const isBirthdayTheme = theme === 'birthday';

  return (
    <BirthdayThemeContext.Provider value={{ isBirthdayTheme }}>
      {children}
    </BirthdayThemeContext.Provider>
  );
};

export default BirthdayThemeContext;
