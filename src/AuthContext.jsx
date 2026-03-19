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
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
