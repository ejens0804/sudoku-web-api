import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useTheme, ff, mf } from './ThemeContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { generatePuzzle, getDailySeed, getDailyDateString, computeAllCandidates } from './sudoku.js';
import ConfettiCanvas from './Confetti.jsx';

const SAVE_KEY = 'sudoku_saved_game';

// ─── Sound ───────────────────────────────────────────────────────────────────

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const tone = (freq, start, dur, vol = 0.07, shape = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = shape;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };
    if (type === 'place')    tone(520, now, 0.09);
    if (type === 'error')   tone(180, now, 0.18, 0.06, 'sawtooth');
    if (type === 'hint')  { tone(660, now, 0.1, 0.06); tone(880, now + 0.09, 0.15, 0.06); }
    if (type === 'complete') [523, 659, 784].forEach((f, i) => tone(f, now + i * 0.07, 0.3, 0.06));
    if (type === 'win')      [523, 659, 784, 1047].forEach((f, i) => tone(f, now + i * 0.1, 0.45, 0.08));
    if (type === 'gameover') [300, 240, 180].forEach((f, i) => tone(f, now + i * 0.13, 0.28, 0.06, 'sawtooth'));
  } catch { /* AudioContext blocked or unavailable */ }
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  { icon: '🧩', title: 'Welcome to Sudoku', body: 'Fill every row, column, and 3×3 box with digits 1–9. Each digit appears exactly once per row, column, and box.' },
  { icon: '👆', title: 'Making Moves', body: 'Tap any empty cell to select it, then tap a number — or use your keyboard. Conflicting numbers glow red automatically.' },
  { icon: '✏️', title: 'Notes & Candidates', body: 'Tap Notes to pencil in candidates for tricky cells. Use Auto-fill to calculate all valid options instantly.' },
  { icon: '💡', title: 'Hints & Streaks', body: 'Stuck? A Hint reveals one correct cell (+30s penalty). Play daily puzzles every day to build your streak!' },
];

// ─── Challenge code ───────────────────────────────────────────────────────────

function encodeChallenge(seed, diff) {
  return ({ easy: 'E', medium: 'M', hard: 'H' }[diff] || 'M') + seed.toString(36).toUpperCase();
}

export function decodeChallengeCode(code) {
  if (!code || code.length < 2) return null;
  const diff = { E: 'easy', M: 'medium', H: 'hard' }[code[0].toUpperCase()];
  if (!diff) return null;
  const seed = parseInt(code.slice(1), 36);
  if (!Number.isFinite(seed) || seed < 1) return null;
  return { difficulty: diff, forceSeed: seed };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function checkCompletedGroups(b) {
  const done = new Set();
  for (let r = 0; r < 9; r++)
    if (new Set(b[r].filter(v => v)).size === 9) done.add(`row-${r}`);
  for (let c = 0; c < 9; c++)
    if (new Set(b.map(r => r[c]).filter(v => v)).size === 9) done.add(`col-${c}`);
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++) {
      const nums = new Set();
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          if (b[br * 3 + dr][bc * 3 + dc]) nums.add(b[br * 3 + dr][bc * 3 + dc]);
      if (nums.size === 9) done.add(`box-${br * 3 + bc}`);
    }
  return done;
}

function getNextEmptyCell(b, r, c) {
  for (let i = r * 9 + c + 1; i < 81; i++) {
    const nr = Math.floor(i / 9), nc = i % 9;
    if (b[nr][nc] === 0) return [nr, nc];
  }
  for (let i = 0; i < r * 9 + c; i++) {
    const nr = Math.floor(i / 9), nc = i % 9;
    if (b[nr][nc] === 0) return [nr, nc];
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameScreen({ difficulty: initDiff, isDaily, forceSeed, onMenu }) {
  const { stats, saveStats, updateGlobalStats } = useAuth();
  const { C, toggle, theme, hexToRgb } = useTheme();
  const { settings, updateSetting } = useSettings();

  const [difficulty] = useState(initDiff);

  // Core puzzle state
  const [board, setBoard] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [given, setGiven] = useState(null);
  const [solution, setSolution] = useState(null);
  const solutionRef = useRef(null);

  // UI state
  const [selected, setSelected] = useState(null);
  const [candidateMode, setCandidateMode] = useState(false);
  const [autoNotes, setAutoNotes] = useState(false);
  const [errors, setErrors] = useState(new Set());
  const [checkedWrong, setCheckedWrong] = useState(new Set());
  const [hintedCell, setHintedCell] = useState(null);
  const [flashGroups, setFlashGroups] = useState(new Set());
  const [flashNum, setFlashNum] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);

  // Game progress
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Post-game info
  const [personalBestDelta, setPersonalBestDelta] = useState(null);
  const [puzzleSeed, setPuzzleSeed] = useState(null);
  const [challengeCode, setChallengeCode] = useState(null);

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const timerRef = useRef(null);

  // ─── Puzzle generation / restore ──────────────────────────────────────────

  const generateNewPuzzle = (skipSaveCheck = false) => {
    if (!skipSaveCheck) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const sameConfig = saved.difficulty === initDiff && saved.isDaily === isDaily;
          const dailyOk = !isDaily || saved.dailyDate === new Date().toDateString();
          if (sameConfig && dailyOk) {
            solutionRef.current = saved.solution;
            setSolution(saved.solution);
            setBoard(saved.board);
            setCandidates(saved.candidates.map(r => r.map(c => new Set(c))));
            setGiven(saved.given);
            setTimer(saved.timer ?? 0);
            setHintsUsed(saved.hintsUsed ?? 0);
            setMistakeCount(saved.mistakeCount ?? 0);
            setPuzzleSeed(saved.puzzleSeed ?? null);
            setSelected(null); setCandidateMode(false); setAutoNotes(false);
            setErrors(new Set()); setRunning(true); setPaused(false);
            setWon(false); setGameOver(false); setHistory([]);
            setShowConfetti(false); setHintedCell(null); setShowShareCard(false);
            setFlashGroups(new Set()); setFlashNum(null); setCheckedWrong(new Set());
            setPersonalBestDelta(null); setChallengeCode(null);
            return;
          }
        }
      } catch { /* ignore corrupt save */ }
    }

    const seed = isDaily
      ? getDailySeed()
      : forceSeed != null
        ? forceSeed
        : Math.floor(Math.random() * 2147483646) + 1;

    if (!isDaily) setPuzzleSeed(seed);

    const { puzzle: p, solution: sol } = generatePuzzle(difficulty, seed);
    solutionRef.current = sol;
    setSolution(sol);
    setBoard(p.map(r => [...r]));
    setCandidates(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
    setGiven(p.map(r => r.map(v => v !== 0)));
    setTimer(0); setRunning(true); setPaused(false); setWon(false); setGameOver(false);
    setSelected(null); setCandidateMode(false); setAutoNotes(false);
    setErrors(new Set()); setHistory([]); setHintsUsed(0); setMistakeCount(0);
    setShowConfetti(false); setHintedCell(null); setShowShareCard(false);
    setFlashGroups(new Set()); setFlashNum(null); setCheckedWrong(new Set());
    setPersonalBestDelta(null); setChallengeCode(null);

    if (!settings.tutorialSeen) {
      setShowTutorial(true);
      setTutorialStep(0);
    }
  };

  useEffect(() => { generateNewPuzzle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent page scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (running && !won && !paused && !gameOver) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running, won, paused, gameOver]);

  // ─── Auto-save ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!board || !given || !solutionRef.current || won || gameOver || !running) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        board,
        candidates: candidates.map(r => r.map(c => [...c])),
        given,
        solution: solutionRef.current,
        timer,
        hintsUsed,
        mistakeCount,
        difficulty,
        isDaily,
        puzzleSeed,
        dailyDate: isDaily ? new Date().toDateString() : null,
      }));
    } catch { /* storage full or blocked */ }
  }, [board, candidates, timer, hintsUsed, mistakeCount, won, gameOver, running]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── History / undo ───────────────────────────────────────────────────────

  const saveState = () => {
    setHistory(h => [...h.slice(-50), {
      board: board.map(r => [...r]),
      candidates: candidates.map(r => r.map(c => new Set(c))),
      errors: new Set(errors),
    }]);
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setBoard(prev.board); setCandidates(prev.candidates); setErrors(prev.errors);
    setHistory(h => h.slice(0, -1));
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateBoard = (b) => {
    const errs = new Set();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = b[r][c];
        if (!v) continue;
        for (let cc = 0; cc < 9; cc++) if (cc !== c && b[r][cc] === v) { errs.add(`${r}-${c}`); break; }
        for (let rr = 0; rr < 9; rr++) if (rr !== r && b[rr][c] === v) { errs.add(`${r}-${c}`); break; }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            if ((br + dr !== r || bc + dc !== c) && b[br + dr][bc + dc] === v) errs.add(`${r}-${c}`);
      }
    }
    setErrors(errs);
  };

  const removeCandFromPeers = (cands, row, col, num) => {
    const nc = cands.map(r => r.map(c => new Set(c)));
    for (let i = 0; i < 9; i++) { nc[row][i].delete(num); nc[i][col].delete(num); }
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++) nc[r][c].delete(num);
    return nc;
  };

  // ─── Win ──────────────────────────────────────────────────────────────────

  const recordWin = async (time) => {
    if (!stats) return;
    const key = isDaily ? 'daily' : difficulty;
    const currentBest = stats[key]?.length ? Math.min(...stats[key].map(e => e.time)) : null;
    setPersonalBestDelta(currentBest !== null ? time - currentBest : null);

    const ns = { ...stats };
    ns[key] = [...(ns[key] || []), { time, hints: hintsUsed, date: new Date().toISOString() }].slice(-50);
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

  const checkWin = (b, finalTimer = timer) => {
    const sol = solutionRef.current;
    if (!sol) return false;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (b[r][c] !== sol[r][c]) return false;
    setWon(true); setRunning(false); setShowConfetti(true);
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    if (!isDaily && puzzleSeed) setChallengeCode(encodeChallenge(puzzleSeed, difficulty));
    recordWin(finalTimer);
    return true;
  };

  // ─── Explicit mistake check ───────────────────────────────────────────────

  const checkMistakes = () => {
    if (!board || !solutionRef.current || won || paused || gameOver) return;
    const sol = solutionRef.current;
    const wrong = new Set();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== 0 && board[r][c] !== sol[r][c]) wrong.add(`${r}-${c}`);
    setCheckedWrong(wrong);
    if (wrong.size > 0 && settings.soundEnabled) playSound('error');
    setTimeout(() => setCheckedWrong(new Set()), 3000);
  };

  // ─── Number input ─────────────────────────────────────────────────────────

  const handleNum = (num) => {
    if (!selected || won || paused || !board || gameOver) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    saveState();

    if (candidateMode) {
      const nc = candidates.map(row => row.map(cell => new Set(cell)));
      nc[r][c].has(num) ? nc[r][c].delete(num) : nc[r][c].add(num);
      setCandidates(nc);
      return;
    }

    const nb = board.map(row => [...row]);

    // Toggle off
    if (nb[r][c] === num) {
      nb[r][c] = 0;
      setBoard(nb); validateBoard(nb);
      return;
    }

    const sol = solutionRef.current;
    const isWrong = sol != null && num !== sol[r][c];

    // Mistake limit mode
    if (isWrong && settings.mistakeLimitMode) {
      const newMC = mistakeCount + 1;
      setMistakeCount(newMC);
      if (newMC >= 3) {
        nb[r][c] = num;
        setBoard(nb); validateBoard(nb);
        setGameOver(true); setRunning(false);
        try { localStorage.removeItem(SAVE_KEY); } catch {}
        if (settings.soundEnabled) playSound('gameover');
        return;
      }
      if (settings.soundEnabled) playSound('error');
    }

    nb[r][c] = num;
    const nc = removeCandFromPeers(candidates, r, c, num);
    nc[r][c] = new Set();
    setCandidates(nc);

    // Flash same-number cells
    setFlashNum(num);
    setTimeout(() => setFlashNum(null), 380);

    // Detect newly completed groups
    const prevGroups = checkCompletedGroups(board);
    const newGroups = new Set([...checkCompletedGroups(nb)].filter(g => !prevGroups.has(g)));
    if (newGroups.size > 0) {
      setFlashGroups(newGroups);
      setTimeout(() => setFlashGroups(new Set()), 900);
    }

    setBoard(nb);
    validateBoard(nb);

    const didWin = checkWin(nb);
    if (didWin) {
      if (settings.soundEnabled) playSound('win');
    } else {
      if (newGroups.size > 0 && settings.soundEnabled) playSound('complete');
      else if (!isWrong && settings.soundEnabled) playSound('place');
      else if (isWrong && settings.soundEnabled) playSound('error');
    }

    // Auto-advance cursor
    if (settings.autoAdvance && !didWin) {
      const next = getNextEmptyCell(nb, r, c);
      if (next) setSelected(next);
    }
  };

  const handleErase = () => {
    if (!selected || won || paused || !board || gameOver) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    saveState();
    const nb = board.map(row => [...row]); nb[r][c] = 0;
    const nc = candidates.map(row => row.map(cell => new Set(cell))); nc[r][c] = new Set();
    setBoard(nb); setCandidates(nc); validateBoard(nb);
  };

  const giveHint = () => {
    if (won || paused || !board || !solution || gameOver) return;
    const sol = solutionRef.current;
    const empty = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0 || board[r][c] !== sol[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    saveState();
    const nb = board.map(row => [...row]); nb[r][c] = sol[r][c];
    const nc = removeCandFromPeers(candidates, r, c, sol[r][c]); nc[r][c] = new Set();
    setBoard(nb); setCandidates(nc);
    const newTimer = timer + 30;
    setTimer(newTimer); setHintsUsed(h => h + 1);
    setHintedCell(`${r}-${c}`);
    setTimeout(() => setHintedCell(null), 1500);
    setSelected([r, c]); validateBoard(nb);
    if (settings.soundEnabled) playSound('hint');
    checkWin(nb, newTimer);
  };

  const toggleAuto = () => {
    if (!board) return;
    const next = !autoNotes; setAutoNotes(next); saveState();
    setCandidates(next
      ? computeAllCandidates(board)
      : Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
  };

  useEffect(() => {
    if (autoNotes && board) setCandidates(computeAllCandidates(board));
  }, [autoNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if (won || paused || gameOver || showTutorial) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) { handleNum(num); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') { handleErase(); return; }
      if (!selected) return;
      const [r, c] = selected;
      if (e.key === 'ArrowUp'    && r > 0) setSelected([r - 1, c]);
      if (e.key === 'ArrowDown'  && r < 8) setSelected([r + 1, c]);
      if (e.key === 'ArrowLeft'  && c > 0) setSelected([r, c - 1]);
      if (e.key === 'ArrowRight' && c < 8) setSelected([r, c + 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selVal = selected && board ? board[selected[0]][selected[1]] : null;

  const countNum = (n) => {
    if (!board) return 0;
    let cnt = 0;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === n) cnt++;
    return cnt;
  };

  const isPeer = (r, c) => {
    if (!selected) return false;
    const [sr, sc] = selected;
    if (r === sr && c === sc) return false;
    return r === sr || c === sc ||
      (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
  };

  const isInFlashGroup = (r, c) => {
    if (!flashGroups.size) return false;
    if (flashGroups.has(`row-${r}`)) return true;
    if (flashGroups.has(`col-${c}`)) return true;
    return flashGroups.has(`box-${Math.floor(r / 3) * 3 + Math.floor(c / 3)}`);
  };

  const shareText = () => {
    const d = isDaily ? 'Daily' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    const stars = hintsUsed === 0 ? '⭐⭐⭐' : hintsUsed <= 2 ? '⭐⭐' : '⭐';
    return `🧩 Sudoku ${d}${isDaily ? ` — ${getDailyDateString()}` : ''}\n⏱ ${fmt(timer)}${hintsUsed > 0 ? ` (${hintsUsed} hint${hintsUsed > 1 ? 's' : ''})` : ''}\n${stars}`;
  };

  const tensionThreshold = difficulty === 'easy' ? 300 : difficulty === 'medium' ? 600 : 900;
  const tensionActive = timer > tensionThreshold && running && !won && !paused && !gameOver;
  const starCount = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (!board || !given || !candidates) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bgGrad, fontFamily: ff }}>
        <span style={{ color: C.textDim, fontSize: 14 }}>Generating puzzle...</span>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.bgGrad, fontFamily: ff, padding: '12px 12px 24px', position: 'relative' }}>

      <style>{`
        @keyframes flashFade { from { opacity: 1; } to { opacity: 0; } }
        @keyframes timerPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
      `}</style>

      <ConfettiCanvas active={showConfetti} />

      {/* ── Tutorial overlay ── */}
      {showTutorial && (
        <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, backdropFilter: 'blur(12px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 20, padding: '32px 28px', maxWidth: 320, width: '88%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>{TUTORIAL_STEPS[tutorialStep].icon}</div>
            <h3 style={{ fontFamily: ff, fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>{TUTORIAL_STEPS[tutorialStep].title}</h3>
            <p style={{ fontFamily: ff, fontSize: 14, color: C.textDim, margin: 0, lineHeight: 1.65 }}>{TUTORIAL_STEPS[tutorialStep].body}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} style={{ width: i === tutorialStep ? 20 : 8, height: 8, borderRadius: 4, background: i === tutorialStep ? C.accent : C.border, transition: 'all 0.2s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => { updateSetting('tutorialSeen', true); setShowTutorial(false); }}
                style={{ flex: 1, padding: '10px', border: `1px solid ${C.border}`, borderRadius: 10, background: 'none', color: C.textDim, fontFamily: ff, fontSize: 13, cursor: 'pointer' }}>
                Skip
              </button>
              <button onClick={() => {
                if (tutorialStep < TUTORIAL_STEPS.length - 1) setTutorialStep(s => s + 1);
                else { updateSetting('tutorialSeen', true); setShowTutorial(false); }
              }} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: C.accent, color: '#fff', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next →' : 'Start Playing!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Win overlay ── */}
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
              {[...Array(starCount)].map((_, i) => <span key={i} style={{ fontSize: 20 }}>⭐</span>)}
            </div>

            {/* Personal best */}
            {personalBestDelta !== null && (
              <div style={{
                padding: '7px 16px', borderRadius: 20,
                background: personalBestDelta < 0 ? 'rgba(107,219,138,0.15)' : C.surfaceAlt,
                color: personalBestDelta < 0 ? C.success : C.textDim,
                fontSize: 13, fontFamily: mf, fontWeight: 600,
              }}>
                {personalBestDelta < 0
                  ? `🏆 New personal best! (${fmt(Math.abs(personalBestDelta))} faster)`
                  : `+${fmt(personalBestDelta)} vs. your best`}
              </div>
            )}

            {/* Challenge code */}
            {challengeCode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
                <span style={{ fontSize: 11, color: C.textDim, fontFamily: ff }}>Share this puzzle with a friend:</span>
                <div
                  onClick={() => navigator.clipboard?.writeText(challengeCode)}
                  title="Click to copy"
                  style={{
                    background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '8px 18px', fontFamily: mf, fontSize: 22, fontWeight: 700,
                    color: C.accent, letterSpacing: '0.12em', cursor: 'pointer',
                  }}
                >
                  {challengeCode}
                </div>
                <span style={{ fontSize: 10, color: C.textDim, fontFamily: ff }}>Enter this code in the menu to play the same puzzle</span>
              </div>
            )}

            {showShareCard && (
              <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', width: '100%', fontFamily: mf, fontSize: 12, color: C.text, whiteSpace: 'pre-line', textAlign: 'left', lineHeight: 1.6 }}>{shareText()}</div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              <button onClick={isDaily ? onMenu : () => generateNewPuzzle(true)}
                style={{ padding: '11px 22px', border: 'none', borderRadius: 10, background: C.accent, color: '#fff', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                New Game
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(shareText()); setShowShareCard(true); }}
                style={{ padding: '11px 22px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surfaceAlt, color: C.text, fontFamily: ff, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share
              </button>
              <button onClick={onMenu}
                style={{ padding: '11px 22px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surfaceAlt, color: C.textDim, fontFamily: ff, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Game Over overlay (lives mode) ── */}
      {gameOver && !won && (
        <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', maxWidth: 320, width: '90%' }}>
            <div style={{ fontSize: 48 }}>💔</div>
            <h2 style={{ fontFamily: ff, fontSize: 24, fontWeight: 700, color: C.error, margin: 0 }}>Too Many Mistakes</h2>
            <p style={{ fontFamily: ff, fontSize: 14, color: C.textDim, margin: 0, lineHeight: 1.55 }}>You made 3 incorrect placements. Better luck next time!</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => generateNewPuzzle(true)}
                style={{ padding: '11px 22px', border: 'none', borderRadius: 10, background: C.accent, color: '#fff', fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                New Game
              </button>
              <button onClick={onMenu}
                style={{ padding: '11px 22px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surfaceAlt, color: C.textDim, fontFamily: ff, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pause overlay ── */}
      {paused && !won && !gameOver && (
        <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill={C.pauseIcon}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            <span style={{ fontFamily: ff, fontSize: 20, fontWeight: 600, color: C.text }}>Paused</span>
            <span style={{ fontFamily: mf, fontSize: 14, color: C.textDim }}>{fmt(timer)}</span>
            <button onClick={() => setPaused(false)}
              style={{ marginTop: 8, padding: '12px 32px', border: 'none', borderRadius: 10, background: C.accent, color: '#fff', fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Resume
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 0' }}>
        <button onClick={() => { setRunning(false); onMenu(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.textDim, fontFamily: ff, fontSize: 13, cursor: 'pointer', padding: '6px 8px', borderRadius: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Menu
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDaily && <span style={{ fontFamily: mf, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: '#ffb86c' }}>DAILY</span>}
          <span style={{ fontFamily: mf, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', color: difficulty === 'easy' ? C.success : difficulty === 'medium' ? C.accent : C.error }}>
            {difficulty.toUpperCase()}
          </span>
          {settings.mistakeLimitMode && (
            <div style={{ display: 'flex', gap: 2 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ fontSize: 11, opacity: i < 3 - mistakeCount ? 1 : 0.18, transition: 'opacity 0.3s' }}>❤️</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => { if (!won && !gameOver) setPaused(p => !p); }}
            style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4 }}>
            {paused
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>}
          </button>
          <button onClick={toggle} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4 }}>
            {theme === 'dark'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          </button>
          <div style={{
            fontFamily: mf, fontSize: 15, fontWeight: 400, minWidth: 52, textAlign: 'right',
            color: tensionActive ? C.error : C.textDim,
            animation: tensionActive ? 'timerPulse 1.2s ease-in-out infinite' : 'none',
          }}>
            {fmt(timer)}
          </div>
        </div>
      </div>

      {/* ── Board ── */}
      <div style={{ padding: 3, borderRadius: 14, border: `2px solid ${C.borderStrong}`, background: C.surface }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gridTemplateRows: 'repeat(9, 1fr)', width: 'min(84vw, 420px)', height: 'min(84vw, 420px)' }}>
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => {
              const isSel  = selected && selected[0] === r && selected[1] === c;
              const ig     = given[r][c];
              const v      = board[r][c];
              const hasErr = errors.has(`${r}-${c}`);
              const hasCheckedErr = checkedWrong.has(`${r}-${c}`);
              const isHint = hintedCell === `${r}-${c}`;
              const isSame = selVal && v === selVal && v !== 0;
              const isP    = isPeer(r, c);
              const inFlash = isInFlashGroup(r, c);

              let bg = 'transparent';
              if (isHint)    bg = C.hintCell;
              else if (isSel)  bg = C.selectedCell;
              else if (isSame) bg = C.sameNumber;
              else if (isP)    bg = C.peerHighlight;

              const bR = c === 2 || c === 5 ? `2px solid ${C.borderStrong}` : c === 8 ? 'none' : `1px solid ${C.border}`;
              const bB = r === 2 || r === 5 ? `2px solid ${C.borderStrong}` : r === 8 ? 'none' : `1px solid ${C.border}`;

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => !paused && !gameOver && setSelected([r, c])}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', userSelect: 'none', transition: 'background-color 0.12s',
                    backgroundColor: bg, borderRight: bR, borderBottom: bB,
                    cursor: paused || gameOver ? 'default' : 'pointer', overflow: 'hidden',
                  }}
                >
                  {/* Group-complete flash overlay */}
                  {inFlash && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(107,219,138,0.45)', animation: 'flashFade 0.9s ease-out forwards', pointerEvents: 'none', zIndex: 1 }} />
                  )}
                  {/* Same-number flash overlay */}
                  {flashNum && v === flashNum && v !== 0 && !isSel && (
                    <div style={{ position: 'absolute', inset: 0, background: `rgba(${hexToRgb(C.accent)},0.28)`, animation: 'flashFade 0.4s ease-out forwards', pointerEvents: 'none', zIndex: 1 }} />
                  )}

                  {paused ? null : v !== 0 ? (
                    <span style={{
                      fontFamily: mf, fontSize: 'min(5.5vw, 24px)', lineHeight: 1,
                      position: 'relative', zIndex: 2,
                      color: ig ? C.given : hasCheckedErr ? '#ff9b4e' : hasErr ? C.error : isHint ? C.success : C.accent,
                      fontWeight: ig ? 600 : 500,
                      textShadow: hasErr ? `0 0 12px ${C.errorGlow}` : hasCheckedErr ? '0 0 12px rgba(255,155,78,0.4)' : isHint ? `0 0 12px ${C.successGlow}` : 'none',
                      transition: 'all 0.3s',
                    }}>{v}</span>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', width: '100%', height: '100%', padding: '1px', position: 'relative', zIndex: 2 }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
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

      {/* ── Controls ── */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
          {/* New */}
          <button onClick={() => generateNewPuzzle(true)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 10px', border: `1px solid ${C.border}`,
            borderRadius: 10, background: C.surface, color: C.textDim,
            cursor: 'pointer', transition: 'all 0.15s', fontFamily: ff,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 500 }}>New</span>
          </button>

          {[
            { label: 'Undo',  fn: undo,         icon: 'M3 7v6h6 M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13', on: false },
            { label: 'Erase', fn: handleErase,  icon: 'M20 20H7L3 16l9-13 8 8-6 9z M13 7l4 4',             on: false },
            { label: 'Hint',  fn: giveHint,     icon: 'M12 2a10 10 0 100 20 10 10 0 000-20z M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3 M12 17h.01', on: false, badge: '+30s' },
            { label: 'Notes', fn: () => setCandidateMode(!candidateMode), icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z', on: candidateMode },
            { label: 'Check', fn: checkMistakes, icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', on: false },
          ].map(({ label, fn, icon, on, badge }) => (
            <button key={label} onClick={fn} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 13px', border: `1px solid ${on ? C.accent : C.border}`,
              borderRadius: 10, background: on ? C.accentSoft : C.surface,
              color: on ? C.accent : C.textDim, cursor: 'pointer',
              transition: 'all 0.15s', fontFamily: ff, position: 'relative',
              boxShadow: on ? `0 0 0 1px ${C.accent}` : 'none',
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
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const cnt = countNum(n), done = cnt >= 9, nearDone = cnt >= 7 && !done;
            return (
              <button key={n} onClick={() => handleNum(n)} disabled={done} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: '10px 0', borderRadius: 10, fontFamily: mf,
                border: `1px solid ${nearDone ? C.accent : C.border}`,
                background: nearDone ? C.accentSoft : C.surface,
                color: C.text, cursor: done ? 'default' : 'pointer',
                transition: 'all 0.15s', opacity: done ? 0.25 : 1,
                boxShadow: nearDone ? `0 0 0 1px ${C.accent}40` : 'none',
              }}>
                <span style={{ fontSize: 'min(5vw, 20px)', fontWeight: 500, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 9, fontWeight: 300, color: nearDone ? C.accent : C.textDim, lineHeight: 1 }}>{9 - cnt}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
