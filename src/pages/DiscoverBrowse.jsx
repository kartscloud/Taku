import React, { useState, useEffect } from 'react';
import { getTopAnime, getSeasonNow, getAnimeByGenre } from '../utils/jikan';
import { getSavedList, addToSaved } from '../utils/storage';

function HorizontalRow({ title, anime, onSave }) {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <h3 style={{
        fontSize: 'var(--fs-body-lg)', fontWeight: 700,
        marginBottom: 'var(--space-sm)',
        padding: '0 var(--space-md)',
      }}>
        {title}
      </h3>
      <div style={{
        display: 'flex', gap: 'var(--space-md)',
        overflowX: 'auto', padding: '0 var(--space-md)',
        scrollSnapType: 'x mandatory',
      }}>
        {anime.map(a => (
          <div key={a.mal_id} style={{
            flexShrink: 0, width: 140, scrollSnapAlign: 'start',
          }}>
            <div style={{
              width: 140, height: 200, borderRadius: 'var(--radius-md)',
              overflow: 'hidden', position: 'relative',
              marginBottom: 'var(--space-xs)',
            }}>
              <img
                src={a.images?.jpg?.image_url}
                alt={a.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(26,17,24,0.7) 0%, transparent 50%)',
              }} />
              <button
                onClick={() => onSave(a)}
                style={{
                  position: 'absolute', bottom: 8, right: 8,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,183,197,0.9)',
                  color: '#2D2420', fontWeight: 700,
                  fontSize: 'var(--fs-caption)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
              {a.score && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.7)',
                  fontSize: 'var(--fs-micro)', fontWeight: 700,
                  color: 'var(--gold)',
                }}>
                  {a.score}
                </div>
              )}
            </div>
            <p style={{
              fontSize: 'var(--fs-small)', fontWeight: 600,
              lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {a.title_english || a.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiscoverBrowse() {
  const [rows, setRows] = useState({});
  const [heroAnime, setHeroAnime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [topRes, seasonRes, fantasyRes] = await Promise.all([
          getTopAnime(1),
          getSeasonNow(1),
          getAnimeByGenre(10, 1),
        ]);

        const top = topRes.data || [];
        const season = seasonRes.data || [];
        const fantasy = fantasyRes.data || [];
        const saved = getSavedList();

        setHeroAnime(top[0] || null);

        const hiddenGems = top.filter(a => a.score >= 7.5 && a.members < 200000).slice(0, 20);

        setRows({
          saved: saved.slice(0, 20),
          top: top.slice(0, 20),
          season: season.slice(0, 20),
          hidden: hiddenGems,
          fantasy: fantasy.slice(0, 20),
        });
      } catch (err) {
        console.error('Browse load error:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = (anime) => {
    addToSaved(anime);
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark-secondary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* Hero banner */}
      {heroAnime && (
        <div style={{
          height: 300, position: 'relative', marginBottom: 'var(--space-lg)',
          overflow: 'hidden',
        }}>
          <img
            src={heroAnime.images?.jpg?.large_image_url}
            alt={heroAnime.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, var(--bg-dark) 0%, rgba(26,17,24,0.4) 50%, rgba(26,17,24,0.2) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 'var(--space-lg)', left: 'var(--space-lg)', right: 'var(--space-lg)',
          }}>
            <div style={{ fontSize: 'var(--fs-small)', color: 'var(--sakura)', fontWeight: 600, marginBottom: 4 }}>
              #1 Recommended
            </div>
            <h2 style={{ fontSize: 'var(--fs-title)', fontWeight: 800, lineHeight: 1.2 }}>
              {heroAnime.title_english || heroAnime.title}
            </h2>
            <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-dark-secondary)', marginTop: 4 }}>
              {heroAnime.genres?.map(g => g.name).join(', ')}
            </div>
            <button
              onClick={() => handleSave(heroAnime)}
              style={{
                marginTop: 'var(--space-md)',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #FFB7C5, #FF8FA3)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700, fontSize: 'var(--fs-body)',
                color: '#2D2420',
              }}
            >
              Save to List
            </button>
          </div>
        </div>
      )}

      {/* Rows */}
      {rows.saved?.length > 0 && (
        <HorizontalRow title="Your Liked Anime" anime={rows.saved} onSave={handleSave} />
      )}
      <HorizontalRow title="Picked for You by Taku" anime={rows.top || []} onSave={handleSave} />
      <HorizontalRow title="New This Season" anime={rows.season || []} onSave={handleSave} />
      {rows.hidden?.length > 0 && (
        <HorizontalRow title="Hidden Gems" anime={rows.hidden} onSave={handleSave} />
      )}
      <HorizontalRow title="Fantasy Worlds" anime={rows.fantasy || []} onSave={handleSave} />
      <div style={{ height: 20 }} />
    </div>
  );
}
