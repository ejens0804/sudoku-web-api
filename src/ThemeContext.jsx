import React, { createContext, useContext, useState } from 'react';

const DARK = {
  bg: '#0f1117',
  bgGrad: 'linear-gradient(145deg, #0f1117 0%, #111422 50%, #0f1117 100%)',
  surface: '#181b24', surfaceAlt: '#1e2230',
  border: '#2a2e3d', borderStrong: '#4a5068',
  text: '#e8eaf0', textDim: '#7b8198',
  accent: '#6c8cff', accentSoft: 'rgba(108,140,255,0.08)',
  error: '#ff6b7a', errorGlow: 'rgba(255,107,122,0.12)',
  success: '#6bdb8a', successGlow: 'rgba(107,219,138,0.15)',
  given: '#c5c9d8', candidate: '#6c8cff',
  selectedCell: 'rgba(108,140,255,0.18)', sameNumber: 'rgba(108,140,255,0.10)',
  peerHighlight: 'rgba(108,140,255,0.04)', hintCell: 'rgba(107,219,138,0.18)',
  overlay: 'rgba(15,17,23,0.85)', pauseIcon: '#3a3f55',
};

const LIGHT = {
  bg: '#f0f2f5',
  bgGrad: 'linear-gradient(145deg, #f0f2f5 0%, #e8ebf0 50%, #f0f2f5 100%)',
  surface: '#ffffff', surfaceAlt: '#f5f6f8',
  border: '#dde0e7', borderStrong: '#b0b5c4',
  text: '#1a1d28', textDim: '#6b7085',
  accent: '#4a6cf7', accentSoft: 'rgba(74,108,247,0.06)',
  error: '#e5534b', errorGlow: 'rgba(229,83,75,0.12)',
  success: '#2da44e', successGlow: 'rgba(45,164,78,0.15)',
  given: '#1a1d28', candidate: '#4a6cf7',
  selectedCell: 'rgba(74,108,247,0.14)', sameNumber: 'rgba(74,108,247,0.08)',
  peerHighlight: 'rgba(74,108,247,0.03)', hintCell: 'rgba(45,164,78,0.14)',
  overlay: 'rgba(240,242,245,0.88)', pauseIcon: '#c5c9d8',
};

const ThemeContext = createContext(null);

export const ff = "'DM Sans', sans-serif";
export const mf = "'DM Mono', monospace";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const C = theme === 'dark' ? DARK : LIGHT;
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, C, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
