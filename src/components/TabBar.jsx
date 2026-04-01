import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/discover', label: 'Discover' },
  { path: '/browse', label: 'Browse' },
  { path: '/search', label: 'Search' },
  { path: '/charts', label: 'Charts' },
  { path: '/mylist', label: 'My List' },
  { path: '/profile', label: 'Profile' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isWarm = ['/mylist', '/charts', '/profile', '/settings'].includes(location.pathname);

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '10px 0 max(10px, env(safe-area-inset-bottom))',
      background: isWarm ? 'var(--bg-warm)' : 'var(--bg-dark)',
      borderTop: `1px solid ${isWarm ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
      flexShrink: 0,
    }}>
      {TABS.map(tab => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              padding: '6px 4px',
              fontSize: 'var(--fs-small)',
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--sakura)' : (isWarm ? 'var(--text-warm-secondary)' : 'var(--text-dark-secondary)'),
              transition: 'color 0.2s',
              letterSpacing: active ? '0.02em' : 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
