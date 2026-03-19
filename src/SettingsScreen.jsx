import { useSettings, ACCENT_PALETTES } from './SettingsContext.jsx';
import { useTheme, ff } from './ThemeContext.jsx';

function Toggle({ label, description, checked, onChange, C }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 12,
        background: C.surface, border: `1px solid ${C.border}`,
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: ff }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 2, fontFamily: ff }}>{description}</div>
        )}
      </div>
      <div style={{
        width: 42, height: 24, borderRadius: 12,
        background: checked ? C.accent : C.border,
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
}

export default function SettingsScreen({ onBack }) {
  const { settings, updateSetting } = useSettings();
  const { C } = useTheme();

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: C.bgGrad, fontFamily: ff, padding: '40px 20px 60px',
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
          <h2 style={{ fontFamily: ff, fontSize: 24, fontWeight: 700, color: C.text, margin: 0, flex: 1, textAlign: 'center' }}>Settings</h2>
          <div style={{ width: 60 }} />
        </div>

        {/* Accent Color */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16, fontFamily: ff }}>Accent Color</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {Object.entries(ACCENT_PALETTES).map(([key, pal]) => {
              const isSelected = settings.accentColor === key;
              return (
                <button key={key} onClick={() => updateSetting('accentColor', key)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  border: 'none', background: 'none', cursor: 'pointer', padding: '4px 2px',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: pal.dark,
                    border: isSelected ? `3px solid ${C.text}` : '3px solid transparent',
                    boxShadow: isSelected ? `0 0 0 2px ${pal.dark}` : 'none',
                    transition: 'all 0.15s',
                  }} />
                  <span style={{
                    fontSize: 9, fontFamily: ff,
                    color: isSelected ? C.text : C.textDim,
                    fontWeight: isSelected ? 600 : 400,
                  }}>{pal.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Highlighting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', padding: '0 4px' }}>GRID HIGHLIGHTING</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              {
                key: 'full',
                label: 'Vivid',
                desc: 'Full color + flash animations',
                preview: [
                  { bg: C.accent + '38' },
                  { bg: C.accent + '60' },
                  { bg: C.accent + '22' },
                  { bg: C.accent + '60' },
                  { bg: C.accent + 'cc', text: true },
                  { bg: C.accent + '60' },
                  { bg: C.accent + '22' },
                  { bg: C.accent + '60' },
                  { bg: C.accent + '38' },
                ],
              },
              {
                key: 'standard',
                label: 'Standard',
                desc: 'Full color, no flash',
                preview: [
                  { bg: C.accent + '22' },
                  { bg: C.accent + '44' },
                  { bg: C.accent + '15' },
                  { bg: C.accent + '44' },
                  { bg: C.accent + 'cc', text: true },
                  { bg: C.accent + '44' },
                  { bg: C.accent + '15' },
                  { bg: C.accent + '44' },
                  { bg: C.accent + '22' },
                ],
              },
              {
                key: 'subtle',
                label: 'Subtle',
                desc: 'Dim colors, no flash',
                preview: [
                  { bg: C.accent + '0d' },
                  { bg: C.accent + '18' },
                  { bg: C.accent + '08' },
                  { bg: C.accent + '18' },
                  { bg: C.accent + '70', text: true },
                  { bg: C.accent + '18' },
                  { bg: C.accent + '08' },
                  { bg: C.accent + '18' },
                  { bg: C.accent + '0d' },
                ],
              },
              {
                key: 'minimal',
                label: 'Minimal',
                desc: 'Selected cell only',
                preview: [
                  { bg: 'transparent' },
                  { bg: 'transparent' },
                  { bg: 'transparent' },
                  { bg: 'transparent' },
                  { bg: C.accent + 'cc', text: true },
                  { bg: 'transparent' },
                  { bg: 'transparent' },
                  { bg: 'transparent' },
                  { bg: 'transparent' },
                ],
              },
            ].map(({ key, label, desc, preview }) => {
              const isSelected = settings.highlightStyle === key;
              return (
                <button
                  key={key}
                  onClick={() => updateSetting('highlightStyle', key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${isSelected ? C.accent : C.border}`,
                    background: isSelected ? C.accentSoft : C.surface,
                    boxShadow: isSelected ? `0 0 0 1px ${C.accent}` : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Mini grid preview */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 2, width: 48, height: 48, borderRadius: 6,
                    overflow: 'hidden', border: `1px solid ${C.border}`,
                  }}>
                    {preview.map((cell, i) => (
                      <div key={i} style={{
                        background: cell.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {cell.text && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? C.accent : C.text, fontFamily: ff }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, fontFamily: ff, lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gameplay Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', padding: '0 4px' }}>GAMEPLAY</div>
          <Toggle
            C={C}
            label="Auto-advance Cursor"
            description="Jump to the next empty cell after placing a number"
            checked={settings.autoAdvance}
            onChange={v => updateSetting('autoAdvance', v)}
          />
          <Toggle
            C={C}
            label="Mistake Limit — 3 Lives"
            description="Game ends after making 3 incorrect placements"
            checked={settings.mistakeLimitMode}
            onChange={v => updateSetting('mistakeLimitMode', v)}
          />
        </div>

        {/* Audio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', padding: '0 4px' }}>AUDIO</div>
          <Toggle
            C={C}
            label="Sound Effects"
            description="Subtle tones for placements, completions, and wins"
            checked={settings.soundEnabled}
            onChange={v => updateSetting('soundEnabled', v)}
          />
        </div>

        {/* Reset tutorial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', padding: '0 4px' }}>OTHER</div>
          <button
            onClick={() => updateSetting('tutorialSeen', false)}
            style={{
              padding: '14px 16px', borderRadius: 12,
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.textDim, fontFamily: ff, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            Show tutorial on next game
          </button>
        </div>

      </div>
    </div>
  );
}
