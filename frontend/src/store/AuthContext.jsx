"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '@/services/axios.client';
import i18n from '../i18n';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [supabaseToken, setSupabaseToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSessionInitializing, setIsSessionInitializing] = useState(false);
  const isFetchingMe = React.useRef(false);

  // Keep fetchUser for manual re-syncs (like updating profile in settings)
  const fetchUser = async () => {
    if (isFetchingMe.current) return;
    isFetchingMe.current = true;
    try {
      const response = await axios.get('/api/users/me');
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        setIsAuthenticated(true);

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
      setIsSessionInitializing(false);
      isFetchingMe.current = false;
    }
  };

  // On initial load, decode token from cookies instead of calling /api/users/me
  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        
        // Check if token is expired
        if (decodedUser.exp && decodedUser.exp * 1000 < Date.now()) {
          console.warn('Token expired on load');
          Cookies.remove('auth_token', { path: '/' });
          Cookies.remove('supabase_token', { path: '/' });
          setLoading(false);
          return;
        }

        setUser(decodedUser);
        
        const storedSbToken = Cookies.get('supabase_token');
        if (storedSbToken) setSupabaseToken(storedSbToken);

        setIsAuthenticated(true);
        
        // Instantly apply preferences stored in the JWT payload
        if (decodedUser.language && decodedUser.language !== i18n.resolvedLanguage) {
          i18n.changeLanguage(decodedUser.language);
        }
        if (decodedUser.theme) {
          localStorage.setItem('app-theme', decodedUser.theme);
          document.documentElement.setAttribute('data-theme', decodedUser.theme === 'system' ? '' : decodedUser.theme);
        }
        if (decodedUser.font) {
          localStorage.setItem('app-font', decodedUser.font);
          document.documentElement.setAttribute('data-font', decodedUser.font);
        }
      } catch (e) {
        console.error('Invalid token in cookies', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (token, sbToken) => {
    setIsSessionInitializing(true);
    Cookies.set('auth_token', token, { expires: 1, path: '/' }); // 1 day
    if (sbToken) {
      Cookies.set('supabase_token', sbToken, { expires: 1, path: '/' });
      setSupabaseToken(sbToken);
    }
    
    // Decode user from the new token
    try {
      const decodedUser = jwtDecode(token);
      setUser(decodedUser);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Failed to decode token on login', e);
    }
    
    setIsSessionInitializing(false);
  };

  const logout = () => {
    Cookies.remove('auth_token', { path: '/' });
    Cookies.remove('supabase_token', { path: '/' });
    setUser(null);
    setSupabaseToken(null);
    setIsAuthenticated(false);
    // Hard redirect to clear any state
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, supabaseToken, isAuthenticated, loading, isSessionInitializing, login, logout, fetchUser }}>
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
