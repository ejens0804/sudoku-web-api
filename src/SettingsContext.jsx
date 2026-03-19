import React, { createContext, useContext, useState } from 'react';

export const ACCENT_PALETTES = {
  blue:   { dark: '#6c8cff', light: '#4a6cf7', name: 'Blue' },
  purple: { dark: '#bd93f9', light: '#7c3aed', name: 'Purple' },
  green:  { dark: '#50fa7b', light: '#16a34a', name: 'Green' },
  red:    { dark: '#ff5f7e', light: '#dc2626', name: 'Red' },
  orange: { dark: '#ffb86c', light: '#ea580c', name: 'Orange' },
  teal:   { dark: '#8be9fd', light: '#0891b2', name: 'Teal' },
  pink:   { dark: '#ff79c6', light: '#db2777', name: 'Pink' },
};

const DEFAULTS = {
  accentColor: 'blue',
  highlightStyle: 'full',   // 'full' | 'standard' | 'subtle' | 'minimal'
  autoAdvance: false,
  mistakeLimitMode: false,
  soundEnabled: false,
  tutorialSeen: false,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem('sudoku_settings');
      return s ? { ...DEFAULTS, ...JSON.parse(s) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  });

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('sudoku_settings', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, ACCENT_PALETTES }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
