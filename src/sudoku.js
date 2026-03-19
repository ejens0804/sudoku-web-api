// ─── Sudoku Generator & Solver ───────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seededShuffleArray(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isValidPlacement(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === num) return false;
  return true;
}

function solveSudokuSeeded(board, rng) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = seededShuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
        for (const n of nums) {
          if (isValidPlacement(board, r, c, n)) {
            board[r][c] = n;
            if (solveSudokuSeeded(board, rng)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function solveSudoku(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValidPlacement(board, r, c, n)) {
            board[r][c] = n;
            if (solveSudoku(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generatePuzzle(difficulty, seed = null) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const rng = seed !== null ? seededRandom(seed) : null;

  if (rng) solveSudokuSeeded(board, rng);
  else solveSudoku(board);

  const solution = board.map((r) => [...r]);
  const cellsToRemove =
    difficulty === 'easy' ? 36 : difficulty === 'medium' ? 46 : 54;

  const positions = rng
    ? seededShuffleArray(Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]), rng)
    : shuffleArray(Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]));

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    const backup = board[r][c];
    board[r][c] = 0;
    let solutions = 0;
    for (let n = 1; n <= 9; n++) {
      if (n === backup) continue;
      if (isValidPlacement(board, r, c, n)) {
        board[r][c] = n;
        const testBoard = board.map((row) => [...row]);
        if (solveSudoku(testBoard)) solutions++;
        board[r][c] = 0;
        if (solutions > 0) break;
      }
    }
    if (solutions > 0) board[r][c] = backup;
    else removed++;
  }
  return { puzzle: board, solution };
}

export function getDailySeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export function getDailyDateString() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function computeAllCandidates(board) {
  const cands = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      for (let n = 1; n <= 9; n++)
        if (isValidPlacement(board, r, c, n)) cands[r][c].add(n);
    }
  return cands;
}
