import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, clearAuth } from '../../utils/api';
import { getMe } from '../utils/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveSession = useCallback((accessToken, userData, refreshToken) => {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (userData) {
      setUser(userData);
      try {
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.user);
      try {
        localStorage.setItem('user', JSON.stringify(res.user));
      } catch (e) {
        // ignore
      }
      return res.user;
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const savedUser = localStorage.getItem('user');
    if (!accessToken && !refreshToken) {
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          setUser(null);
        }
      }
      setLoading(false);
      return;
    }
    getMe()
      .then((res) => {
        setUser(res.user);
        try {
          localStorage.setItem('user', JSON.stringify(res.user));
        } catch (e) {
          // ignore
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value = {
    user,
    loading,
    saveSession,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return ctx;
}
