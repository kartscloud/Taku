import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuth, getAuth, storage } from '../utils/storage';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Fill in both fields.');
      return;
    }

    const hashed = await hashPassword(password);
    const users = storage.get('users', {});

    if (isLogin) {
      const user = users[username];
      if (!user || user.hash !== hashed) {
        setError('Invalid username or password.');
        return;
      }
    } else {
      if (users[username]) {
        setError('Username already taken.');
        return;
      }
      users[username] = { hash: hashed, createdAt: Date.now() };
      storage.set('users', users);
    }

    setAuth({ username, loggedInAt: Date.now() });
    navigate('/discover');
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-warm)', color: 'var(--text-warm)',
      padding: 'var(--space-xl)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 style={{
          fontSize: 'var(--fs-hero)',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #FFB7C5, #FF8FA3)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 'var(--space-sm)',
        }}>
          Taku
        </h1>
        <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-warm-secondary)' }}>
          Anime Taste Engine
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 340,
        display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
      }}>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          style={{
            padding: '14px 18px',
            background: 'var(--bg-warm-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--fs-body)',
            color: 'var(--text-warm)',
          }}
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{
            padding: '14px 18px',
            background: 'var(--bg-warm-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--fs-body)',
            color: 'var(--text-warm)',
          }}
        />
        {error && (
          <p style={{ color: '#D44', fontSize: 'var(--fs-caption)', textAlign: 'center' }}>{error}</p>
        )}
        <button type="submit" style={{
          padding: '14px',
          background: 'linear-gradient(135deg, #FFB7C5, #FF8FA3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--fs-body)',
          fontWeight: 700,
          color: '#2D2420',
        }}>
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          style={{
            fontSize: 'var(--fs-caption)',
            color: 'var(--text-warm-secondary)',
            textAlign: 'center',
            padding: 'var(--space-sm)',
          }}
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
