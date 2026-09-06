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

  // Keep fetchUser for profile sync — merges JWT auth fields with API profile data
  const fetchUser = async () => {
    if (isFetchingMe.current) return;
    isFetchingMe.current = true;
    try {
      const response = await axios.get('/api/users/me');
      if (response.success && response.data) {
        const profileData = response.data;

        // Merge: pull email, roles, permissions from the current JWT token
        // since /api/users/me no longer returns them (they live in the token)
        const token = Cookies.get('auth_token');
        let tokenData = {};
        if (token) {
          try {
            const { jwtDecode } = await import('jwt-decode');
            tokenData = jwtDecode(token);
          } catch {}
        }

        const userData = {
          ...profileData,
          email: tokenData.email || profileData.email,
          roles: tokenData.roles,
          permissions: tokenData.permissions || [],
        };

        setUser(userData);
        setIsAuthenticated(true);

        // Sync preferences
        const syncDetail = {};
        if (userData.language && userData.language !== i18n.resolvedLanguage) {
          i18n.changeLanguage(userData.language);
        }
        if (userData.theme) {
          localStorage.setItem('app-theme', userData.theme);
          syncDetail.theme = userData.theme;
        }
        if (userData.font) {
          localStorage.setItem('app-font', userData.font);
          syncDetail.font = userData.font;
        }
        if (syncDetail.theme || syncDetail.font) {
          window.dispatchEvent(new CustomEvent('app-theme-sync', { detail: syncDetail }));
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

  // On initial load, decode token from cookies for auth state & preferences,
  // then fetch full profile from /api/users/me
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

        // Set minimal auth state immediately from JWT
        setUser(decodedUser);
        const storedSbToken = Cookies.get('supabase_token');
        if (storedSbToken) setSupabaseToken(storedSbToken);
        setIsAuthenticated(true);

        // Apply theme/font preferences immediately (no flash)
        const syncDetail = {};
        if (decodedUser.language && decodedUser.language !== i18n.resolvedLanguage) {
          i18n.changeLanguage(decodedUser.language);
        }
        if (decodedUser.theme) {
          localStorage.setItem('app-theme', decodedUser.theme);
          syncDetail.theme = decodedUser.theme;
        }
        if (decodedUser.font) {
          localStorage.setItem('app-font', decodedUser.font);
          syncDetail.font = decodedUser.font;
        }
        if (syncDetail.theme || syncDetail.font) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('app-theme-sync', { detail: syncDetail }));
          }, 0);
        }

        // Fetch full profile data asynchronously so settings form populates correctly
        fetchUser();
        return;
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

    // Decode minimal auth state from the slim JWT
    try {
      const decodedUser = jwtDecode(token);
      setUser(decodedUser);
      setIsAuthenticated(true);

      // Apply theme/font preferences immediately
      const syncDetail = {};
      if (decodedUser.language && decodedUser.language !== i18n.resolvedLanguage) {
        i18n.changeLanguage(decodedUser.language);
      }
      if (decodedUser.theme) {
        localStorage.setItem('app-theme', decodedUser.theme);
        syncDetail.theme = decodedUser.theme;
      }
      if (decodedUser.font) {
        localStorage.setItem('app-font', decodedUser.font);
        syncDetail.font = decodedUser.font;
      }
      if (syncDetail.theme || syncDetail.font) {
        window.dispatchEvent(new CustomEvent('app-theme-sync', { detail: syncDetail }));
      }
    } catch (e) {
      console.error('Failed to decode token on login', e);
    }

    // Fetch full profile so settings/header have all fields
    await fetchUser();
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
