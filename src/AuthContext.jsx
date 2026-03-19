import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, runTransaction, increment } from 'firebase/firestore';

const AuthContext = createContext(null);

const EMPTY_STATS = {
  easy: [],
  medium: [],
  hard: [],
  daily: [],
  streak: 0,
  lastPlayDate: null,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Load stats from Firestore
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            setStats(snap.data().stats || { ...EMPTY_STATS });
          } else {
            // First login — create document
            const fresh = { ...EMPTY_STATS };
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              stats: fresh,
              displayName: firebaseUser.displayName || firebaseUser.email,
              createdAt: new Date().toISOString(),
            });
            // Increment global total users count
            try {
              await setDoc(doc(db, 'globalStats', 'summary'), { totalUsers: increment(1) }, { merge: true });
            } catch (_) {}
            setStats(fresh);
          }
        } catch (err) {
          console.error('Failed to load stats:', err);
          setStats({ ...EMPTY_STATS });
        }
      } else {
        setUser(null);
        setStats(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Update global stats when a game is completed
  const updateGlobalStats = async (difficulty, time, hints) => {
    if (!user) return;
    const displayName = user.displayName || user.email?.split('@')[0] || 'Player';
    try {
      // 1. Increment summary counts atomically using flat field names
      const summaryRef = doc(db, 'globalStats', 'summary');
      await setDoc(summaryRef, {
        totalGames: increment(1),
        [`${difficulty}Count`]: increment(1),
        [`${difficulty}TotalTime`]: increment(time),
      }, { merge: true });

      // 2. Update leaderboard — one entry per user (personal best), top 10
      const lbRef = doc(db, 'globalStats', 'leaderboards');
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(lbRef);
        const data = snap.exists() ? snap.data() : {};
        const board = [...(data[difficulty] || [])];
        const entry = { userId: user.uid, displayName, time, hints, date: new Date().toISOString() };
        const idx = board.findIndex((e) => e.userId === user.uid);
        if (idx !== -1) {
          if (time < board[idx].time) board[idx] = entry;
        } else {
          board.push(entry);
        }
        board.sort((a, b) => a.time - b.time);
        tx.set(lbRef, { [difficulty]: board.slice(0, 10) }, { merge: true });
      });

      // 3. Update per-user activity totals
      const actRef = doc(db, 'globalStats', 'activity');
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(actRef);
        const data = snap.exists() ? snap.data() : { users: {} };
        const users = { ...(data.users || {}) };
        users[user.uid] = {
          displayName,
          totalGames: ((users[user.uid]?.totalGames) || 0) + 1,
        };
        tx.set(actRef, { users }, { merge: true });
      });
    } catch (err) {
      console.error('Failed to update global stats:', err);
    }
  };

  // Save stats to Firestore
  const saveStats = async (newStats) => {
    setStats(newStats);
    if (user) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          { stats: newStats },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to save stats:', err);
      }
    }
  };

  // Auth actions
  const login = async (email, password) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(friendlyError(err.code));
      throw err;
    }
  };

  const signup = async (email, password, displayName) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
    } catch (err) {
      setAuthError(friendlyError(err.code));
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setAuthError(friendlyError(err.code));
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    stats,
    loading,
    authError,
    setAuthError,
    login,
    signup,
    loginWithGoogle,
    logout,
    saveStats,
    updateGlobalStats,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
