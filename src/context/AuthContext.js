import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiVerifyToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken]     = useState(null);
  const [user, setUser]       = useState(null);   // { username, userId }
  const [loading, setLoading] = useState(true);   // true while checking stored token

  // On app launch: restore token from storage and verify it's still valid
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        if (stored && storedUser) {
          const res = await apiVerifyToken(stored);
          if (res.ok) {
            setToken(stored);
            setUser(JSON.parse(storedUser));
          } else {
            await AsyncStorage.multiRemove(['token', 'user']);
          }
        }
      } catch {
        // Storage read failed — start fresh
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    await AsyncStorage.setItem('token', tokenValue);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'user']);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
