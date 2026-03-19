import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useTheme, ff, mf } from './ThemeContext.jsx';

export default function LoginScreen() {
  const { login, signup, loginWithGoogle, authError, setAuthError } = useAuth();
  const { C, toggle, theme } = useTheme();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch {
      // error is set via context
    }
    setBusy(false);
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch {
      // error is set via context
    }
    setBusy(false);
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setAuthError(null);
  };

  const input = (props) => ({
    style: {
      width: '100%',
      padding: '14px 16px',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      background: C.surface,
      color: C.text,
      fontFamily: ff,
      fontSize: 14,
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    ...props,
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bgGrad, fontFamily: ff, padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Theme toggle */}
        <button onClick={toggle} style={{
          alignSelf: 'flex-end', background: 'none', border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '6px 12px', color: C.textDim, fontFamily: ff,
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

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

        <h1 style={{ fontFamily: ff, fontSize: 38, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>
          Sudoku
        </h1>

        {/* Card */}
        <div style={{
          width: '100%', background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <h2 style={{ fontFamily: ff, fontSize: 18, fontWeight: 600, color: C.text, margin: 0, textAlign: 'center' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {mode === 'signup' && (
            <input
              {...input({
                type: 'text',
                placeholder: 'Display name',
                value: displayName,
                onChange: (e) => setDisplayName(e.target.value),
              })}
            />
          )}

          <input
            {...input({
              type: 'email',
              placeholder: 'Email address',
              value: email,
              onChange: (e) => setEmail(e.target.value),
              onKeyDown: (e) => e.key === 'Enter' && handleSubmit(),
            })}
          />

          <input
            {...input({
              type: 'password',
              placeholder: 'Password',
              value: password,
              onChange: (e) => setPassword(e.target.value),
              onKeyDown: (e) => e.key === 'Enter' && handleSubmit(),
            })}
          />

          {authError && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: `${C.error}18`,
              border: `1px solid ${C.error}40`, color: C.error, fontSize: 13, fontWeight: 500,
            }}>
              {authError}
            </div>
          )}

          <button onClick={handleSubmit} disabled={busy} style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: 10,
            background: C.accent, color: '#fff', fontFamily: ff, fontSize: 14,
            fontWeight: 600, cursor: busy ? 'wait' : 'pointer', letterSpacing: '0.06em',
            opacity: busy ? 0.7 : 1, transition: 'opacity 0.2s',
          }}>
            {busy ? '...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Google sign-in */}
          <button onClick={handleGoogle} disabled={busy} style={{
            width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: 10,
            background: C.surfaceAlt, color: C.text, fontFamily: ff, fontSize: 13,
            fontWeight: 500, cursor: busy ? 'wait' : 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle */}
          <p style={{ textAlign: 'center', fontSize: 13, color: C.textDim, margin: 0 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={switchMode} style={{ color: C.accent, cursor: 'pointer', fontWeight: 600 }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
