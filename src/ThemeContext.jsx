import { createContext, useContext, useState } from 'react';
import { useSettings, ACCENT_PALETTES } from './SettingsContext.jsx';

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

const BASE_DARK = {
  bg: '#0f1117',
  bgGrad: 'linear-gradient(145deg, #0f1117 0%, #111422 50%, #0f1117 100%)',
  surface: '#181b24', surfaceAlt: '#1e2230',
  border: '#2a2e3d', borderStrong: '#4a5068',
  text: '#e8eaf0', textDim: '#7b8198',
  error: '#ff6b7a', errorGlow: 'rgba(255,107,122,0.12)',
  success: '#6bdb8a', successGlow: 'rgba(107,219,138,0.15)',
  given: '#c5c9d8',
  hintCell: 'rgba(107,219,138,0.18)',
  overlay: 'rgba(15,17,23,0.85)', pauseIcon: '#3a3f55',
};

const BASE_LIGHT = {
  bg: '#f0f2f5',
  bgGrad: 'linear-gradient(145deg, #f0f2f5 0%, #e8ebf0 50%, #f0f2f5 100%)',
  surface: '#ffffff', surfaceAlt: '#f5f6f8',
  border: '#dde0e7', borderStrong: '#b0b5c4',
  text: '#1a1d28', textDim: '#6b7085',
  error: '#e5534b', errorGlow: 'rgba(229,83,75,0.12)',
  success: '#2da44e', successGlow: 'rgba(45,164,78,0.15)',
  given: '#1a1d28',
  hintCell: 'rgba(45,164,78,0.14)',
  overlay: 'rgba(240,242,245,0.88)', pauseIcon: '#c5c9d8',
};

const ThemeContext = createContext(null);

export const ff = "'DM Sans', sans-serif";
export const mf = "'DM Mono', monospace";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const { settings } = useSettings();

  const palette = ACCENT_PALETTES[settings.accentColor] || ACCENT_PALETTES.blue;
  const accent = theme === 'dark' ? palette.dark : palette.light;
  const rgb = hexToRgb(accent);
  const a = (alpha) => `rgba(${rgb},${alpha})`;

  const base = theme === 'dark' ? BASE_DARK : BASE_LIGHT;
  const C = {
    ...base,
    accent,
    accentSoft: a(theme === 'dark' ? 0.08 : 0.06),
    candidate: accent,
    selectedCell: a(theme === 'dark' ? 0.22 : 0.16),
    sameNumber: a(theme === 'dark' ? 0.12 : 0.09),
    peerHighlight: a(theme === 'dark' ? 0.05 : 0.04),
  };

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, C, toggle, hexToRgb }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
