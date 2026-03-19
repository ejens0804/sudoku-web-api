import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useTheme, ff, mf } from './ThemeContext.jsx';
import { generatePuzzle, getDailySeed, getDailyDateString, isValidPlacement, computeAllCandidates } from './sudoku.js';
import ConfettiCanvas from './Confetti.jsx';

export default function GameScreen({ difficulty: initDiff, isDaily, onMenu }) {
  const { stats, saveStats, updateGlobalStats } = useAuth();
  const { C, toggle, theme } = useTheme();

  const [difficulty] = useState(initDiff);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [given, setGiven] = useState(null);
  const [selected, setSelected] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [autoNotes, setAutoNotes] = useState(false);
  const [errors, setErrors] = useState(new Set());
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);
  const [history, setHistory] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hintedCell, setHintedCell] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const timerRef = useRef(null);
  const solutionRef = useRef(null);

  const generateNewPuzzle = () => {
    const seed = isDaily ? getDailySeed() : null;
    const { puzzle: p, solution: sol } = generatePuzzle(difficulty, seed);
    solutionRef.current = sol;
    setSolution(sol);
    setBoard(p.map((r) => [...r]));
    setCandidates(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
    setGiven(p.map((r) => r.map((v) => v !== 0)));
    setSelected(null);
    setCandidateMode(false);
    setAutoNotes(false);
    setErrors(new Set());
    setTimer(0);
    setRunning(true);
    setPaused(false);
    setWon(false);
    setHistory([]);
    setHintsUsed(0);
    setShowConfetti(false);
    setHintedCell(null);
    setShowShareCard(false);
  };

  // Generate puzzle on mount
  useEffect(() => {
    generateNewPuzzle();
  }, []);

  // Prevent page scroll while playing (arrow keys would otherwise scroll)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Timer
  useEffect(() => {
    if (running && !won && !paused) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running, won, paused]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const saveState = () => {
    setHistory((h) => [...h.slice(-50), {
      board: board.map((r) => [...r]),
      candidates: candidates.map((r) => r.map((c) => new Set(c))),
      errors: new Set(errors),
    }]);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setBoard(prev.board); setCandidates(prev.candidates); setErrors(prev.errors);
    setHistory((h) => h.slice(0, -1));
  };

  const recordWin = async (time) => {
    if (!stats) return;
    const entry = { time, hints: hintsUsed, date: new Date().toISOString() };
    const ns = { ...stats };
    const key = isDaily ? 'daily' : difficulty;
    ns[key] = [...(ns[key] || []), entry].slice(-50);
    const today = new Date().toDateString();
    const lp = ns.lastPlayDate;
    if (lp) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lp === yesterday) ns.streak = (ns.streak || 0) + 1;
      else if (lp !== today) ns.streak = 1;
    } else ns.streak = 1;
    ns.lastPlayDate = today;
    await saveStats(ns);
    await updateGlobalStats(key, time, hintsUsed);
  };

  const checkWin = (b) => {
    const sol = solutionRef.current;
    if (!sol) return false;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (b[r][c] !== sol[r][c]) return false;
    setWon(true); setRunning(false); setShowConfetti(true);
    recordWin(timer);
    return true;
  };

  const validateBoard = (b) => {
    const errs = new Set();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = b[r][c];
        if (v === 0) continue;
        // Check row
        for (let cc = 0; cc < 9; cc++)
          if (cc !== c && b[r][cc] === v) { errs.add(`${r}-${c}`); break; }
        // Check column
        for (let rr = 0; rr < 9; rr++)
          if (rr !== r && b[rr][c] === v) { errs.add(`${r}-${c}`); break; }
        // Check 3x3 box
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            if ((br + dr !== r || bc + dc !== c) && b[br + dr][bc + dc] === v)
              errs.add(`${r}-${c}`);
      }
    }
    setErrors(errs);
  };

  const removeCandFromPeers = (cands, row, col, num) => {
    const nc = cands.map((r) => r.map((c) => new Set(c)));
    for (let i = 0; i < 9; i++) { nc[row][i].delete(num); nc[i][col].delete(num); }
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++) nc[r][c].delete(num);
    return nc;
  };

  const handleNum = (num) => {
    if (!selected || won || paused || !board) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    saveState();
    if (candidateMode) {
      const nc = candidates.map((row) => row.map((cell) => new Set(cell)));
      nc[r][c].has(num) ? nc[r][c].delete(num) : nc[r][c].add(num);
      setCandidates(nc);
    } else {
      const nb = board.map((row) => [...row]);
      if (nb[r][c] === num) { nb[r][c] = 0; }
      else {
        nb[r][c] = num;
        const nc = removeCandFromPeers(candidates, r, c, num);
        nc[r][c] = new Set();
        setCandidates(nc);
      }
      setBoard(nb); validateBoard(nb); checkWin(nb);
    }
  };

  const handleErase = () => {
    if (!selected || won || paused || !board) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    saveState();
    const nb = board.map((row) => [...row]); nb[r][c] = 0;
    const nc = candidates.map((row) => row.map((cell) => new Set(cell))); nc[r][c] = new Set();
    setBoard(nb); setCandidates(nc); validateBoard(nb);
  };

  const giveHint = () => {
    if (won || paused || !board || !solution) return;
    const empty = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0 || board[r][c] !== solution[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    saveState();
    const nb = board.map((row) => [...row]); nb[r][c] = solution[r][c];
    const nc = removeCandFromPeers(candidates, r, c, solution[r][c]); nc[r][c] = new Set();
    setBoard(nb); setCandidates(nc);
    setTimer((t) => t + 30); setHintsUsed((h) => h + 1);
    setHintedCell(`${r}-${c}`);
    setTimeout(() => setHintedCell(null), 1500);
    setSelected([r, c]); validateBoard(nb); checkWin(nb);
  };

  const toggleAuto = () => {
    if (!board) return;
    const next = !autoNotes; setAutoNotes(next); saveState();
    setCandidates(next ? computeAllCandidates(board) : Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
  };

  useEffect(() => { if (autoNotes && board) setCandidates(computeAllCandidates(board)); }, [board, autoNotes]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (won || paused) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) { handleNum(num); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') { handleErase(); return; }
      if (!selected) return;
      const [r, c] = selected;
      if (e.key === 'ArrowUp' && r > 0) setSelected([r - 1, c]);
      if (e.key === 'ArrowDown' && r < 8) setSelected([r + 1, c]);
      if (e.key === 'ArrowLeft' && c > 0) setSelected([r, c - 1]);
      if (e.key === 'ArrowRight' && c < 8) setSelected([r, c + 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const selVal = selected && board ? board[selected[0]][selected[1]] : null;
  const countNum = (n) => { if (!board) return 0; let c = 0; for (let r = 0; r < 9; r++) for (let cc = 0; cc < 9; cc++) if (board[r][cc] === n) c++; return c; };
  const isPeer = (r, c) => {
    if (!selected) return false;
    const [sr, sc] = selected;
    if (r === sr && c === sc) return false;
    return r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
  };

  const shareText = () => {
    const d = isDaily ? 'Daily' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    const stars = hintsUsed === 0 ? '⭐⭐⭐' : hintsUsed <= 2 ? '⭐⭐' : '⭐';
    return `🧩 Sudoku ${d}${isDaily ? ` — ${getDailyDateString()}` : ''}\n⏱ ${fmt(timer)}${hintsUsed > 0 ? ` (${hintsUsed} hint${hintsUsed > 1 ? 's' : ''})` : ''}\n${stars}`;
  };

  if (!board || !given || !candidates) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgGrad, fontFamily: ff }}>
        <span style={{ color: C.textDim, fontSize: 14 }}>Generating puzzle...</span>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.bgGrad, fontFamily: ff, padding: '12px 12px 24px', position: 'relative' }}>
      <ConfettiCanvas active={showConfetti} />

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 0' }}>
        <button onClick={() => { setRunning(false); onMenu(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.textDim, fontFamily: ff, fontSize: 13, cursor: 'pointer', padding: '6px 8px', borderRadius: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Menu
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDaily && <span style={{ fontFamily: mf, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: '#ffb86c' }}>DAILY</span>}
          <span style={{ fontFamily: mf, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', color: difficulty === 'easy' ? C.success : difficulty === 'medium' ? C.accent : C.error }}>{difficulty.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => { if (!won) setPaused((p) => !p); }} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4 }}>
            {paused
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            }
          </button>
          <button onClick={toggle} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4 }}>
            {theme === 'dark'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          <div style={{ fontFamily: mf, fontSize: 15, fontWeight: 400, color: C.textDim, minWidth: 52, textAlign: 'right' }}>{fmt(timer)}</div>
        </div>
      </div>

      {/* Win overlay */}
      {won && (
        <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', maxWidth: 340, width: '90%' }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <h2 style={{ fontFamily: ff, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Puzzle Complete!</h2>
            <p style={{ fontFamily: mf, fontSize: 14, color: C.textDim, margin: 0 }}>
              {fmt(timer)} · {isDaily ? 'Daily' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              {hintsUsed > 0 && ` · ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}`}
            </p>
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              {[...Array(hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1)].map((_, i) => <span key={i} style={{ fontSize: 20 }}>⭐</span>)}
            </div>
            {showShareCard && (
              <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', width: '100%', fontFamily: mf, fontSize: 12, color: C.text, whiteSpace: 'pre-line', textAlign: 'left', lineHeight: 1.6 }}>{shareText()}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              <button onClick={isDaily ? onMenu : generateNewPuzzle} style={{ padding: '11px 22px', border: 'none', borderRadius: 10, background: C.accent, color: '#fff', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>New Game</button>
              <button onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(shareText()); setShowShareCard(true); }} style={{ padding: '11px 22px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surfaceAlt, color: C.text, fontFamily: ff, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share
              </button>
              <button onClick={onMenu} style={{ padding: '11px 22px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surfaceAlt, color: C.textDim, fontFamily: ff, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused && !won && (
        <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill={C.pauseIcon}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            <span style={{ fontFamily: ff, fontSize: 20, fontWeight: 600, color: C.text }}>Paused</span>
            <span style={{ fontFamily: mf, fontSize: 14, color: C.textDim }}>{fmt(timer)}</span>
            <button onClick={() => setPaused(false)} style={{ marginTop: 8, padding: '12px 32px', border: 'none', borderRadius: 10, background: C.accent, color: '#fff', fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Resume</button>
          </div>
        </div>
      )}

      {/* Board */}
      <div style={{ padding: 3, borderRadius: 14, border: `2px solid ${C.borderStrong}`, background: C.surface }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gridTemplateRows: 'repeat(9, 1fr)', width: 'min(84vw, 420px)', height: 'min(84vw, 420px)' }}>
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => {
              const isSel = selected && selected[0] === r && selected[1] === c;
              const ig = given[r][c];
              const v = board[r][c];
              const hasErr = errors.has(`${r}-${c}`);
              const isHint = hintedCell === `${r}-${c}`;
              const isSame = selVal && v === selVal && v !== 0;
              const isP = isPeer(r, c);

              let bg = 'transparent';
              if (isHint) bg = C.hintCell;
              else if (isSel) bg = C.selectedCell;
              else if (isSame) bg = C.sameNumber;
              else if (isP) bg = C.peerHighlight;

              const bR = c === 2 || c === 5 ? `2px solid ${C.borderStrong}` : c === 8 ? 'none' : `1px solid ${C.border}`;
              const bB = r === 2 || r === 5 ? `2px solid ${C.borderStrong}` : r === 8 ? 'none' : `1px solid ${C.border}`;

              return (
                <div key={`${r}-${c}`} onClick={() => !paused && setSelected([r, c])} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  userSelect: 'none', transition: 'background-color 0.12s',
                  backgroundColor: bg, borderRight: bR, borderBottom: bB, cursor: paused ? 'default' : 'pointer',
                }}>
                  {paused ? null : v !== 0 ? (
                    <span style={{
                      fontFamily: mf, fontSize: 'min(5.5vw, 24px)', lineHeight: 1,
                      color: ig ? C.given : hasErr ? C.error : isHint ? C.success : C.accent,
                      fontWeight: ig ? 600 : 500,
                      textShadow: hasErr ? `0 0 12px ${C.errorGlow}` : isHint ? `0 0 12px ${C.successGlow}` : 'none',
                      transition: 'all 0.3s',
                    }}>{v}</span>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', width: '100%', height: '100%', padding: '1px' }}>
                      {[1,2,3,4,5,6,7,8,9].map((n) => (
                        <span key={n} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: mf, fontSize: 'min(2.2vw, 10px)', color: C.candidate,
                          lineHeight: 1, fontWeight: 400, transition: 'opacity 0.15s',
                          opacity: candidates[r][c].has(n) ? 1 : 0,
                        }}>{n}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {/* Action row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {/* New Puzzle (small) */}
          <button onClick={isDaily ? onMenu : generateNewPuzzle} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 10px', border: `1px solid ${C.border}`,
            borderRadius: 10, background: C.surface,
            color: C.textDim, cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: ff, position: 'relative',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.02em' }}>New</span>
          </button>
          {[
            { label: 'Undo', fn: undo, icon: 'M3 7v6h6 M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13', on: false },
            { label: 'Erase', fn: handleErase, icon: 'M20 20H7L3 16l9-13 8 8-6 9z M13 7l4 4', on: false },
            { label: 'Hint', fn: giveHint, icon: 'M12 2a10 10 0 100 20 10 10 0 000-20z M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3 M12 17h.01', on: false, badge: '+30s' },
            { label: 'Notes', fn: () => setCandidateMode(!candidateMode), icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z', on: candidateMode },
          ].map(({ label, fn, icon, on, badge }) => (
            <button key={label} onClick={fn} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 14px', border: `1px solid ${on ? C.accent : C.border}`,
              borderRadius: 10, background: on ? C.accentSoft : C.surface,
              color: on ? C.accent : C.textDim, cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: ff, position: 'relative', boxShadow: on ? `0 0 0 1px ${C.accent}` : 'none',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : `M${seg}`} />)}
              </svg>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
              {badge && <span style={{ position: 'absolute', top: -4, right: -4, background: C.error, color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 6, fontFamily: mf }}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* Auto-notes */}
        <div onClick={toggleAuto} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${autoNotes ? C.accent : C.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: autoNotes ? C.accent : 'transparent', transition: 'all 0.15s' }}>
            {autoNotes && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <span style={{ fontFamily: ff, fontSize: 13, fontWeight: 500, color: C.text }}>Auto-fill candidates</span>
          <span style={{ marginLeft: 'auto', fontFamily: mf, fontSize: 11, fontWeight: 300, color: C.textDim }}>Show all valid</span>
        </div>

        {/* Number pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 5 }}>
          {[1,2,3,4,5,6,7,8,9].map((n) => {
            const cnt = countNum(n), done = cnt >= 9;
            return (
              <button key={n} onClick={() => handleNum(n)} disabled={done} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: '10px 0', border: `1px solid ${C.border}`, borderRadius: 10,
                background: C.surface, color: C.text, cursor: done ? 'default' : 'pointer',
                transition: 'all 0.15s', fontFamily: mf, opacity: done ? 0.25 : 1,
              }}>
                <span style={{ fontSize: 'min(5vw, 20px)', fontWeight: 500, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 9, fontWeight: 300, color: C.textDim, lineHeight: 1 }}>{9 - cnt}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
