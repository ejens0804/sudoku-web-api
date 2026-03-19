import { useAuth } from './AuthContext.jsx';
import { useTheme, ff, mf } from './ThemeContext.jsx';

const MILESTONE_BADGES = [
  { min: 100, emoji: '🏆', label: 'Centurion',  color: '#ffd700' },
  { min: 30,  emoji: '🥇', label: 'Dedicated',  color: '#ffd700' },
  { min: 7,   emoji: '🔥', label: 'On Fire',    color: '#ffb86c' },
];

function getMilestoneBadge(streak) {
  return MILESTONE_BADGES.find(b => streak >= b.min) ?? null;
}

export default function StatsScreen({ onBack }) {
  const { stats, saveStats, clearUserGlobalStats } = useAuth();
  const { C } = useTheme();

  const fmt = (s) =>
    s == null ? '--:--' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const getBest  = (k) => stats?.[k]?.length ? Math.min(...stats[k].map(e => e.time)) : null;
  const getAvg   = (k) => {
    if (!stats?.[k]?.length) return null;
    const t = stats[k].map(e => e.time);
    return Math.round(t.reduce((a, b) => a + b, 0) / t.length);
  };
  const getCount = (k) => stats?.[k]?.length || 0;

  const cats = [
    { key: 'easy',   label: 'Easy',   color: C.success },
    { key: 'medium', label: 'Medium', color: C.accent },
    { key: 'hard',   label: 'Hard',   color: C.error },
    { key: 'daily',  label: 'Daily',  color: '#ffb86c' },
  ];

  const streak = stats?.streak || 0;
  const badge = getMilestoneBadge(streak);

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: C.bgGrad, fontFamily: ff, padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: C.textDim, cursor: 'pointer',
            padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center',
            gap: 6, fontFamily: ff, fontSize: 13,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Menu
          </button>
          <h2 style={{ fontFamily: ff, fontSize: 24, fontWeight: 700, color: C.text, margin: 0, flex: 1, textAlign: 'center' }}>Your Stats</h2>
          <div style={{ width: 60 }} />
        </div>

        {/* Streak card */}
        <div style={{
          background: C.surface, border: `1px solid ${badge ? badge.color + '60' : C.border}`,
          borderRadius: 14, padding: '20px 24px', textAlign: 'center',
          boxShadow: badge ? `0 0 0 1px ${badge.color}30` : 'none',
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: C.accent, fontFamily: mf }}>{streak}</div>
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 500, marginTop: 4 }}>Day Streak</div>

          {badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 10, padding: '5px 14px', borderRadius: 20,
              background: badge.color + '18', border: `1px solid ${badge.color}50`,
            }}>
              <span style={{ fontSize: 16 }}>{badge.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: badge.color, fontFamily: ff }}>{badge.label}</span>
            </div>
          )}

          {/* Milestone progress hints */}
          {!badge && streak > 0 && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, fontFamily: ff }}>
              {7 - streak} more day{7 - streak !== 1 ? 's' : ''} to earn the 🔥 On Fire badge
            </div>
          )}
          {badge?.min === 7 && streak < 30 && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, fontFamily: ff }}>
              {30 - streak} more day{30 - streak !== 1 ? 's' : ''} to earn the 🥇 Dedicated badge
            </div>
          )}
          {badge?.min === 30 && streak < 100 && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, fontFamily: ff }}>
              {100 - streak} more day{100 - streak !== 1 ? 's' : ''} to earn the 🏆 Centurion badge
            </div>
          )}
        </div>

        {/* Per-difficulty cards */}
        {cats.map(({ key, label, color }) => {
          const played = getCount(key), best = getBest(key), avg = getAvg(key);
          return (
            <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontFamily: ff, fontSize: 15, fontWeight: 600, color: C.text }}>{label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: mf, fontSize: 12, color: C.textDim }}>
                  {played} game{played !== 1 ? 's' : ''}
                </span>
              </div>
              {played > 0 ? (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textDim, fontWeight: 500, marginBottom: 2 }}>BEST</div>
                    <div style={{ fontFamily: mf, fontSize: 18, fontWeight: 600, color }}>{fmt(best)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textDim, fontWeight: 500, marginBottom: 2 }}>AVG</div>
                    <div style={{ fontFamily: mf, fontSize: 18, fontWeight: 500, color: C.text }}>{fmt(avg)}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.textDim, fontStyle: 'italic' }}>No games yet</div>
              )}
            </div>
          );
        })}

        <button onClick={async () => {
          await clearUserGlobalStats();
          const empty = { easy: [], medium: [], hard: [], daily: [], streak: 0, lastPlayDate: null };
          await saveStats(empty);
        }} style={{
          background: 'none', border: 'none', color: C.error, fontFamily: ff,
          fontSize: 12, cursor: 'pointer', padding: 8, opacity: 0.7,
        }}>
          Reset all stats
        </button>

      </div>
    </div>
  );
}
