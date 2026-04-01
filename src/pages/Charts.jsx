import React, { useState, useEffect } from 'react';
import { getTopAnime } from '../utils/jikan';
import { addToSaved } from '../utils/storage';

const FILTERS = [
  { key: '', label: 'Top Rated' },
  { key: 'bypopularity', label: 'Popular' },
  { key: 'favorite', label: 'Most Loved' },
];

const RANK_COLORS = {
  1: '#C9A84C',
  2: '#A0A0A8',
  3: '#B87333',
};

export default function Charts() {
  const [filter, setFilter] = useState('');
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    getTopAnime(1, filter).then(data => {
      setAnime(data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const loadMore = async () => {
    const next = page + 1;
    const data = await getTopAnime(next, filter);
    setAnime(prev => [...prev, ...(data.data || [])]);
    setPage(next);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-warm)', color: 'var(--text-warm)',
    }}>
      <div style={{ padding: 'var(--space-lg) var(--space-md) var(--space-md)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 'var(--fs-heading)', fontWeight: 800, marginBottom: 'var(--space-md)' }}>Charts</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 16px',
                background: filter === f.key ? 'var(--sakura)' : 'var(--bg-warm-secondary)',
                color: filter === f.key ? '#2D2420' : 'var(--text-warm-secondary)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--fs-caption)', fontWeight: 600,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 var(--space-md)' }}>
        {loading && <p style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-warm-secondary)' }}>Loading...</p>}
        {anime.map((a, i) => {
          const rank = i + 1;
          const rankColor = RANK_COLORS[rank];
          return (
            <div key={a.mal_id} style={{
              display: 'flex', gap: 'var(--space-md)', alignItems: 'center',
              padding: 'var(--space-md) 0',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width: 32, textAlign: 'center',
                fontSize: rankColor ? 'var(--fs-subheading)' : 'var(--fs-body)',
                fontWeight: 800,
                color: rankColor || 'var(--text-warm-secondary)',
              }}>
                {rank}
              </div>
              <img
                src={a.images?.jpg?.image_url}
                alt={a.title}
                style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                loading="lazy"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--fs-body)', fontWeight: 600, marginBottom: 2 }}>
                  {a.title_english || a.title}
                </p>
                <p style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)' }}>
                  {a.genres?.map(g => g.name).join(', ')}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 2 }}>
                  {a.score && <span style={{ fontSize: 'var(--fs-small)', color: 'var(--gold)', fontWeight: 700 }}>{a.score}</span>}
                  {a.episodes && <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)' }}>{a.episodes} ep</span>}
                </div>
              </div>
              <button
                onClick={() => addToSaved(a)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-warm-secondary)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--fs-small)', fontWeight: 600,
                  color: 'var(--sakura)',
                  flexShrink: 0,
                }}
              >
                +
              </button>
            </div>
          );
        })}
        {anime.length > 0 && (
          <button
            onClick={loadMore}
            style={{
              display: 'block', margin: 'var(--space-lg) auto',
              padding: '10px 24px',
              background: 'var(--bg-warm-secondary)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--fs-body)', fontWeight: 600,
              color: 'var(--text-warm)',
            }}
          >
            Load More
          </button>
        )}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
