import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'darkMode';

export const lightTheme = {
  dark:        false,
  background:  '#f5f6fa',
  card:        '#ffffff',
  text:        '#1a1a2e',
  subtext:     '#888888',
  muted:       '#bbbbbb',
  border:      '#e5e7eb',
  input:       '#ffffff',
  placeholder: '#cccccc',
  headerBg:    '#6200ee',
  tabBar:      '#ffffff',
};

export const darkTheme = {
  dark:        true,
  background:  '#0f0f14',
  card:        '#1c1c26',
  text:        '#f0f0f5',
  subtext:     '#8888aa',
  muted:       '#444455',
  border:      '#2a2a3a',
  input:       '#252532',
  placeholder: '#44445a',
  headerBg:    '#3a006f',
  tabBar:      '#1c1c26',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
