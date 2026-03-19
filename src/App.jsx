import { useState } from 'react';
import { SettingsProvider } from './SettingsContext.jsx';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { ThemeProvider } from './ThemeContext.jsx';
import LoginScreen from './LoginScreen.jsx';
import MenuScreen from './MenuScreen.jsx';
import StatsScreen from './StatsScreen.jsx';
import GlobalStatsScreen from './GlobalStatsScreen.jsx';
import GameScreen from './GameScreen.jsx';
import SettingsScreen from './SettingsScreen.jsx';

function AppInner() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('menu');
  const [gameConfig, setGameConfig] = useState(null);

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f1117', fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #2a2e3d', borderTop: '3px solid #6c8cff',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: '#7b8198', fontSize: 14 }}>Loading...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (screen === 'stats') return <StatsScreen onBack={() => setScreen('menu')} />;
  if (screen === 'globalStats') return <GlobalStatsScreen onBack={() => setScreen('menu')} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => setScreen('menu')} />;

  if (screen === 'game' && gameConfig) {
    return (
      <GameScreen
        difficulty={gameConfig.difficulty}
        isDaily={gameConfig.isDaily}
        forceSeed={gameConfig.forceSeed ?? null}
        onMenu={() => { setGameConfig(null); setScreen('menu'); }}
      />
    );
  }

  return (
    <MenuScreen
      onPlay={(diff, forceSeed) => {
        setGameConfig({ difficulty: diff, isDaily: false, forceSeed: forceSeed ?? null });
        setScreen('game');
      }}
      onDaily={() => {
        setGameConfig({ difficulty: 'medium', isDaily: true, forceSeed: null });
        setScreen('game');
      }}
      onStats={() => setScreen('stats')}
      onGlobalStats={() => setScreen('globalStats')}
      onSettings={() => setScreen('settings')}
    />
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
