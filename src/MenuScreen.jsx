import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useTheme, ff, mf } from './ThemeContext.jsx';

export default function MenuScreen({ onPlay, onDaily, onStats }) {
  const { user, logout } = useAuth();
  const { C, toggle, theme } = useTheme();
  const [difficulty, setDifficulty] = useState('medium');

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player';

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bgGrad, fontFamily: ff, padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Top bar: user info + theme */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: ff, fontSize: 14, fontWeight: 700,
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{displayName}</div>
              <button onClick={logout} style={{
                background: 'none', border: 'none', color: C.textDim, fontFamily: ff,
                fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 500,
              }}>Sign out</button>
            </div>
          </div>
          <button onClick={toggle} style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '6px 12px', color: C.textDim, fontFamily: ff, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Logo */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gridTemplateRows: 'repeat(3, 36px)',
          gap: 3, borderRadius: 10, overflow: 'hidden', border: `2px solid ${C.borderStrong}`,
          padding: 3, background: C.surface,
        }}>
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <div key={n} style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontFamily: mf, fontWeight: 500, color: C.accent, background: C.surfaceAlt,
              borderRadius: 4,
            }}>{n}</div>
          ))}
        </div>

        <h1 style={{ fontFamily: ff, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
          Sudoku
        </h1>
        <p style={{ fontFamily: ff, fontSize: 15, color: C.textDim, margin: 0, fontWeight: 300, letterSpacing: '0.04em' }}>
          Choose your challenge
        </p>

        {/* Difficulty selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              border: `1px solid ${difficulty === d ? C.accent : C.border}`,
              borderRadius: 12, background: difficulty === d ? C.accentSoft : C.surface,
              color: C.text, fontFamily: ff, fontSize: 15, fontWeight: 500, cursor: 'pointer',
              boxShadow: difficulty === d ? `0 0 0 1px ${C.accent}` : 'none', transition: 'all 0.2s',
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: d === 'easy' ? C.success : d === 'medium' ? C.accent : C.error,
              }} />
              <span style={{ textTransform: 'capitalize' }}>{d}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textDim, fontFamily: mf, fontWeight: 300 }}>
                {d === 'easy' ? '~36 blanks' : d === 'medium' ? '~46 blanks' : '~54 blanks'}
              </span>
            </button>
          ))}
        </div>

        {/* Play */}
        <button onClick={() => onPlay(difficulty, false)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '16px 24px', border: 'none', borderRadius: 12,
          background: C.accent, color: '#fff', fontFamily: ff, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em',
        }}>
          GENERATE & PLAY
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        {/* Daily */}
        <button onClick={() => onDaily()} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '14px 24px', border: `1px solid ${C.accent}`,
          borderRadius: 12, background: 'transparent', color: C.accent,
          fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          DAILY PUZZLE
        </button>

        {/* Stats */}
        <button onClick={onStats} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: 10,
          background: C.surfaceAlt, color: C.textDim, fontFamily: ff, fontSize: 13,
          fontWeight: 500, cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          Personal Stats
        </button>
      </div>
    </div>
  );
}
