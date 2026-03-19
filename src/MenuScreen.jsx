import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useTheme, ff, mf } from './ThemeContext.jsx';
import { decodeChallengeCode } from './GameScreen.jsx';

const SAVE_KEY = 'sudoku_saved_game';

export default function MenuScreen({ onPlay, onDaily, onStats, onGlobalStats, onSettings }) {
  const { user, logout } = useAuth();
  const { C, toggle, theme } = useTheme();
  const [difficulty, setDifficulty] = useState('medium');
  const [savedGame, setSavedGame] = useState(null);
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeError, setChallengeError] = useState('');
  const [showChallengeInput, setShowChallengeInput] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player';

  // Check for a saved game on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Validate it's not stale (daily must be today)
        if (saved.isDaily && saved.dailyDate !== new Date().toDateString()) {
          localStorage.removeItem(SAVE_KEY);
        } else {
          setSavedGame(saved);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const handleChallengePlay = () => {
    const decoded = decodeChallengeCode(challengeInput.trim().toUpperCase());
    if (!decoded) {
      setChallengeError('Invalid code — try again');
      return;
    }
    setChallengeError('');
    onPlay(decoded.difficulty, decoded.forceSeed);
  };

  const diffLabel = savedGame
    ? savedGame.isDaily
      ? 'Daily'
      : savedGame.difficulty.charAt(0).toUpperCase() + savedGame.difficulty.slice(1)
    : null;

  const fmt = (s) =>
    s == null ? '' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bgGrad, fontFamily: ff, padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

        {/* Top bar */}
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
              <button onClick={logout} style={{ background: 'none', border: 'none', color: C.textDim, fontFamily: ff, fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                Sign out
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onSettings} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '6px 10px', color: C.textDim, fontFamily: ff, fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              Settings
            </button>
            <button onClick={toggle} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '6px 10px', color: C.textDim, fontFamily: ff, fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>

        {/* Logo */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gridTemplateRows: 'repeat(3, 36px)',
          gap: 3, borderRadius: 10, overflow: 'hidden', border: `2px solid ${C.borderStrong}`,
          padding: 3, background: C.surface,
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <div key={n} style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontFamily: mf, fontWeight: 500, color: C.accent, background: C.surfaceAlt, borderRadius: 4,
            }}>{n}</div>
          ))}
        </div>

        <h1 style={{ fontFamily: ff, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>Sudoku</h1>
        <p style={{ fontFamily: ff, fontSize: 15, color: C.textDim, margin: 0, fontWeight: 300, letterSpacing: '0.04em' }}>Choose your challenge</p>

        {/* Resume saved game banner */}
        {savedGame && (
          <div style={{
            width: '100%', padding: '14px 18px', borderRadius: 12,
            background: C.accentSoft, border: `1px solid ${C.accent}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {diffLabel} in progress — {fmt(savedGame.timer)}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                Saved game available
              </div>
            </div>
            <button
              onClick={() => onPlay(savedGame.difficulty, savedGame.isDaily ? undefined : savedGame.puzzleSeed)}
              style={{
                padding: '8px 14px', border: 'none', borderRadius: 8,
                background: C.accent, color: '#fff', fontFamily: ff,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              Resume
            </button>
          </div>
        )}

        {/* Difficulty selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              border: `1px solid ${difficulty === d ? C.accent : C.border}`,
              borderRadius: 12, background: difficulty === d ? C.accentSoft : C.surface,
              color: C.text, fontFamily: ff, fontSize: 15, fontWeight: 500, cursor: 'pointer',
              boxShadow: difficulty === d ? `0 0 0 1px ${C.accent}` : 'none', transition: 'all 0.2s',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: d === 'easy' ? C.success : d === 'medium' ? C.accent : C.error }} />
              <span style={{ textTransform: 'capitalize' }}>{d}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textDim, fontFamily: mf, fontWeight: 300 }}>
                {d === 'easy' ? '~36 blanks' : d === 'medium' ? '~46 blanks' : '~54 blanks'}
              </span>
            </button>
          ))}
        </div>

        {/* Play button */}
        <button onClick={() => onPlay(difficulty)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '16px 24px', border: 'none', borderRadius: 12,
          background: C.accent, color: '#fff', fontFamily: ff, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em',
        }}>
          GENERATE & PLAY
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        {/* Daily puzzle */}
        <button onClick={onDaily} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '14px 24px', border: `1px solid ${C.accent}`,
          borderRadius: 12, background: 'transparent', color: C.accent,
          fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          DAILY PUZZLE
        </button>

        {/* Challenge code */}
        <div style={{ width: '100%' }}>
          <button
            onClick={() => { setShowChallengeInput(s => !s); setChallengeError(''); }}
            style={{
              width: '100%', background: 'none', border: 'none', color: C.textDim,
              fontFamily: ff, fontSize: 12, cursor: 'pointer', padding: '4px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            {showChallengeInput ? 'Hide challenge code' : 'Play a challenge code'}
          </button>

          {showChallengeInput && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <input
                value={challengeInput}
                onChange={e => { setChallengeInput(e.target.value.toUpperCase()); setChallengeError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleChallengePlay()}
                placeholder="e.g. M3K9F2A"
                maxLength={12}
                style={{
                  flex: 1, padding: '10px 14px', border: `1px solid ${challengeError ? C.error : C.border}`,
                  borderRadius: 10, background: C.surface, color: C.text,
                  fontFamily: mf, fontSize: 15, fontWeight: 600, letterSpacing: '0.08em',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleChallengePlay}
                style={{
                  padding: '10px 16px', border: 'none', borderRadius: 10,
                  background: C.accent, color: '#fff', fontFamily: ff,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}
              >
                Play
              </button>
            </div>
          )}
          {challengeError && (
            <div style={{ fontSize: 12, color: C.error, marginTop: 4, textAlign: 'center', fontFamily: ff }}>
              {challengeError}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button onClick={onStats} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', border: `1px solid ${C.border}`, borderRadius: 10,
            background: C.surfaceAlt, color: C.textDim, fontFamily: ff, fontSize: 13,
            fontWeight: 500, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            My Stats
          </button>
          <button onClick={onGlobalStats} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', border: `1px solid ${C.border}`, borderRadius: 10,
            background: C.surfaceAlt, color: C.textDim, fontFamily: ff, fontSize: 13,
            fontWeight: 500, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
            Leaderboard
          </button>
        </div>

      </div>
    </div>
  );
}
