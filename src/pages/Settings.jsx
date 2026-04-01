import React, { useState } from 'react';
import { getSettings, updateSettings, setAuth, storage } from '../utils/storage';
import { CHARACTER_VOICES } from '../utils/constants';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [settings, setSettingsState] = useState(getSettings);
  const navigate = useNavigate();

  const update = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettingsState(updated);
    updateSettings({ [key]: value });
  };

  const handleLogout = () => {
    setAuth(null);
    navigate('/auth');
  };

  const handleClearData = () => {
    if (confirm('This will delete all your saved anime, ratings, and settings. Are you sure?')) {
      const auth = storage.get('auth');
      const users = storage.get('users', {});
      localStorage.clear();
      storage.set('users', users);
      if (auth) setAuth(auth);
      window.location.reload();
    }
  };

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      background: 'var(--bg-warm)', color: 'var(--text-warm)',
    }}>
      <div style={{ padding: 'var(--space-lg) var(--space-md)' }}>
        <h1 style={{ fontSize: 'var(--fs-heading)', fontWeight: 800, marginBottom: 'var(--space-xl)' }}>
          Settings
        </h1>

        {/* API Keys */}
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            API Keys
          </h3>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-warm-secondary)', display: 'block', marginBottom: 4 }}>
              OpenAI API Key (for Taku AI)
            </label>
            <input
              type="password"
              value={settings.openaiKey}
              onChange={e => update('openaiKey', e.target.value)}
              placeholder="sk-..."
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--bg-warm-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--fs-body)',
                color: 'var(--text-warm)',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-warm-secondary)', display: 'block', marginBottom: 4 }}>
              ElevenLabs API Key (for character voices)
            </label>
            <input
              type="password"
              value={settings.elevenLabsKey}
              onChange={e => update('elevenLabsKey', e.target.value)}
              placeholder="xi-..."
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--bg-warm-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--fs-body)',
                color: 'var(--text-warm)',
              }}
            />
          </div>
        </section>

        {/* Voice Selection */}
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Taku Voice
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {Object.entries(CHARACTER_VOICES).map(([key, voice]) => (
              <button
                key={key}
                onClick={() => update('selectedVoice', key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: settings.selectedVoice === key ? 'rgba(255,183,197,0.15)' : 'var(--bg-warm-secondary)',
                  border: settings.selectedVoice === key ? '2px solid var(--sakura)' : '2px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: settings.selectedVoice === key ? 'var(--sakura)' : 'var(--bg-warm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 'var(--fs-caption)',
                  color: settings.selectedVoice === key ? '#2D2420' : 'var(--text-warm-secondary)',
                  flexShrink: 0,
                }}>
                  {voice.name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>
                    {voice.name}
                  </p>
                  <p style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)' }}>
                    {voice.series}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Auto-speak toggle */}
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <button
            onClick={() => update('autoSpeak', !settings.autoSpeak)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: 'var(--space-md)',
              background: 'var(--bg-warm-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>Auto-speak responses</span>
            <div style={{
              width: 48, height: 28, borderRadius: 14,
              background: settings.autoSpeak ? 'var(--sakura)' : 'rgba(0,0,0,0.15)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'white',
                position: 'absolute', top: 2,
                left: settings.autoSpeak ? 22 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </button>
        </section>

        {/* Danger zone */}
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700, marginBottom: 'var(--space-md)', color: '#D44' }}>
            Danger Zone
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <button
              onClick={handleClearData}
              style={{
                padding: '12px',
                background: 'rgba(221,68,68,0.1)',
                border: '1px solid rgba(221,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#D44', fontWeight: 600,
                fontSize: 'var(--fs-body)',
              }}
            >
              Clear All Data
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px',
                background: 'var(--bg-warm-secondary)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600, fontSize: 'var(--fs-body)',
                color: 'var(--text-warm)',
              }}
            >
              Log Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
