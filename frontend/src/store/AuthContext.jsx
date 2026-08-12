import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../services/axios.client';
import i18n from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/users/me');
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        setIsAuthenticated(true);
        sessionStorage.setItem('auth_user', JSON.stringify(userData));

        // Sync preferences
        if (userData.language && userData.language !== i18n.resolvedLanguage) {
          i18n.changeLanguage(userData.language);
        }
        if (userData.theme) {
          localStorage.setItem('app-theme', userData.theme);
          document.documentElement.setAttribute('data-theme', userData.theme === 'system' ? '' : userData.theme);
        }
        if (userData.font) {
          localStorage.setItem('app-font', userData.font);
          document.documentElement.setAttribute('data-font', userData.font);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const storedUser = sessionStorage.getItem('auth_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          setLoading(false);
        } catch (e) {
          fetchUser();
        }
      } else {
        fetchUser();
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (token, userData) => {
    localStorage.setItem('auth_token', token);
    // Set minimal user data first
    setUser(userData);
    setIsAuthenticated(true);
    // Fetch full profile immediately
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    setUser(null);
    setIsAuthenticated(false);
    // Let the protected route handle redirect if needed, or window.location.href = '/login'
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
