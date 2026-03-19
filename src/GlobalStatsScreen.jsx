import { useState, useEffect } from 'react';
import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme, ff, mf } from './ThemeContext.jsx';

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   color: '#50fa7b' },
  { key: 'medium', label: 'Medium', color: '#6c8cff' },
  { key: 'hard',   label: 'Hard',   color: '#ff5555' },
  { key: 'daily',  label: 'Daily',  color: '#ffb86c' },
];

const fmt = (s) =>
  s == null ? '--:--' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s) % 60).padStart(2, '0')}`;

export default function GlobalStatsScreen({ onBack }) {
  const { C } = useTheme();
  const [summary, setSummary] = useState(null);
  const [leaderboards, setLeaderboards] = useState(null);
  const [activity, setActivity] = useState(null);
  const [activeTab, setActiveTab] = useState('easy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumSnap, lbSnap, actSnap] = await Promise.all([
          getDoc(doc(db, 'globalStats', 'summary')),
          getDoc(doc(db, 'globalStats', 'leaderboards')),
          getDoc(doc(db, 'globalStats', 'activity')),
        ]);
        setSummary(sumSnap.exists() ? sumSnap.data() : {});
        setLeaderboards(lbSnap.exists() ? lbSnap.data() : {});
        setActivity(actSnap.exists() ? actSnap.data() : {});
      } catch (err) {
        console.error('Failed to load global stats:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalGames = summary?.totalGames || 0;
  const totalUsers = summary?.totalUsers || 0;

  const getAvgTime = (key) => {
    const count = summary?.[`${key}Count`] || 0;
    const total = summary?.[`${key}TotalTime`] || 0;
    return count > 0 ? total / count : null;
  };

  const topActive = activity?.users
    ? Object.entries(activity.users)
        .map(([userId, d]) => ({ userId, ...d }))
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 10)
    : [];

  const board = leaderboards?.[activeTab] || [];

  const medalColor = (i) => i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : C.textDim;

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgGrad }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ color: C.textDim, fontSize: 13, fontFamily: ff }}>Loading stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: C.bgGrad, fontFamily: ff, padding: '40px 20px 60px' }}>
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: ff, fontSize: 13 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Menu
          </button>
          <h2 style={{ fontFamily: ff, fontSize: 24, fontWeight: 700, color: C.text, margin: 0, flex: 1, textAlign: 'center' }}>Global Stats</h2>
          <div style={{ width: 60 }} />
        </div>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: mf }}>{totalUsers.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: C.textDim, fontWeight: 500, marginTop: 4 }}>Total Players</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, fontFamily: mf }}>{totalGames.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: C.textDim, fontWeight: 500, marginTop: 4 }}>Games Played</div>
          </div>
        </div>

        {/* Average times */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontFamily: ff, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Average Solve Times</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DIFFICULTIES.map(({ key, label, color }) => {
              const avg = getAvgTime(key);
              const count = summary?.[`${key}Count`] || 0;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500, width: 56 }}>{label}</span>
                  <div style={{ flex: 1, height: 4, background: C.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                    {avg != null && totalGames > 0 && (
                      <div style={{ height: '100%', width: `${Math.min(100, (count / totalGames) * 100 * 3)}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    )}
                  </div>
                  <span style={{ fontFamily: mf, fontSize: 14, fontWeight: 600, color: avg != null ? color : C.textDim, minWidth: 52, textAlign: 'right' }}>
                    {fmt(avg)}
                  </span>
                  <span style={{ fontFamily: mf, fontSize: 11, color: C.textDim, minWidth: 36, textAlign: 'right' }}>
                    {count > 0 ? `${count.toLocaleString()}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 0', fontFamily: ff, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Fastest Times</div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, paddingLeft: 12, paddingRight: 12 }}>
            {DIFFICULTIES.map(({ key, label, color }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                flex: 1, padding: '8px 4px', border: 'none', background: 'none',
                fontFamily: ff, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: activeTab === key ? color : C.textDim,
                borderBottom: `2px solid ${activeTab === key ? color : 'transparent'}`,
                transition: 'all 0.15s', letterSpacing: '0.04em',
              }}>
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Entries */}
          <div style={{ padding: '8px 0' }}>
            {board.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: C.textDim, fontStyle: 'italic' }}>No records yet</div>
            ) : (
              board.map((entry, i) => (
                <div key={entry.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < board.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontFamily: mf, fontSize: 14, fontWeight: 700, color: medalColor(i), minWidth: 20, textAlign: 'center' }}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.displayName}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                      {entry.hints === 0 ? '⭐⭐⭐ No hints' : entry.hints === 1 ? '⭐⭐ 1 hint' : `⭐ ${entry.hints} hints`}
                    </div>
                  </div>
                  <span style={{ fontFamily: mf, fontSize: 16, fontWeight: 700, color: DIFFICULTIES.find(d => d.key === activeTab)?.color }}>{fmt(entry.time)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Active Players */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', fontFamily: ff, fontSize: 14, fontWeight: 600, color: C.text }}>Most Active Players</div>
          {topActive.length === 0 ? (
            <div style={{ padding: '0 20px 20px', fontSize: 13, color: C.textDim, fontStyle: 'italic' }}>No activity yet</div>
          ) : (
            <div style={{ padding: '0 0 8px' }}>
              {topActive.map((player, i) => {
                const pct = topActive[0]?.totalGames > 0 ? (player.totalGames / topActive[0].totalGames) * 100 : 0;
                return (
                  <div key={player.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderBottom: i < topActive.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ fontFamily: mf, fontSize: 13, fontWeight: 700, color: medalColor(i), minWidth: 20, textAlign: 'center' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{player.displayName}</div>
                      <div style={{ height: 3, background: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: C.accent, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: mf, fontSize: 14, fontWeight: 700, color: C.accent, minWidth: 28, textAlign: 'right' }}>{player.totalGames}</span>
                    <span style={{ fontSize: 11, color: C.textDim }}>games</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
