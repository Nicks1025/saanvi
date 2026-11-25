"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios, { refreshAuthToken } from '@/services/axios.client';
import i18n from '../i18n';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSessionInitializing, setIsSessionInitializing] = useState(true);
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

  // On initial load, restore session: check auth_token or refresh token if expired/missing
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      setIsSessionInitializing(true);
      try {
        const token = Cookies.get('auth_token');
        let activeToken = token;
        let decodedUser = null;

        if (token) {
          try {
            const decoded = jwtDecode(token);
            if (decoded.exp && decoded.exp * 1000 > Date.now() + 10000) {
              decodedUser = decoded;
            }
          } catch (e) {
            activeToken = null;
          }
        }

        // If no active valid token found, attempt session restoration via refresh token
        if (!decodedUser) {
          const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
          const search = typeof window !== 'undefined' ? window.location.search : '';
          const isAuthPage =
            pathname.startsWith('/login') ||
            pathname.startsWith('/signup') ||
            pathname.startsWith('/forgot-password') ||
            pathname.startsWith('/reset-password') ||
            pathname.startsWith('/verify-otp') ||
            search.includes('reason=session_expired');

          if (!isAuthPage) {
            try {
              const refreshedToken = await refreshAuthToken();
              if (refreshedToken) {
                activeToken = refreshedToken;
                decodedUser = jwtDecode(refreshedToken);
              }
            } catch (refreshErr) {
              setUser(null);
              setIsAuthenticated(false);
              setLoading(false);
              setIsSessionInitializing(false);
              return;
            }
          }
        }

        if (decodedUser) {
          setUser(decodedUser);
          setIsAuthenticated(true);

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

          await fetchUser();
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        setIsSessionInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (token) => {
    setIsSessionInitializing(true);
    Cookies.set('auth_token', token, { expires: 7, path: '/' });

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

  const logout = async () => {
    try {
      await axios.post('/api/login/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    Cookies.remove('auth_token', { path: '/' });
    Cookies.remove('supabase_token', { path: '/' });
    setUser(null);
    setIsAuthenticated(false);
    // Hard redirect to clear any state if not already on /login
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated, loading, isSessionInitializing, login, logout, fetchUser, hasPermission }}>
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
