import React, { useState, useCallback } from 'react';
import { getSavedList, setTier, removeFromSaved } from '../utils/storage';
import { TIERS, TIER_COLORS, TIER_LABELS } from '../utils/constants';

function RecommendationCard({ title, subtitle, anime }) {
  if (!anime) return null;
  return (
    <div style={{
      flex: '1 1 0', minWidth: 100, padding: 'var(--space-md)',
      background: 'var(--bg-warm-secondary)', borderRadius: 'var(--radius-md)',
    }}>
      <p style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)', marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 'var(--fs-caption)', fontWeight: 700 }}>{anime.title_english || anime.title}</p>
      <p style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-warm-secondary)' }}>{subtitle}</p>
    </div>
  );
}

export default function MyList() {
  const [list, setList] = useState(getSavedList);
  const [filterTier, setFilterTier] = useState(null);
  const [ratingAnime, setRatingAnime] = useState(null);
  const [view, setView] = useState('grid'); // grid | tierlist

  const refresh = () => setList(getSavedList());

  const handleSetTier = (malId, tier) => {
    setTier(malId, tier);
    refresh();
    setRatingAnime(null);
  };

  const handleRemove = (malId) => {
    removeFromSaved(malId);
    refresh();
  };

  const filtered = filterTier ? list.filter(a => a.tier === filterTier) : list;

  // Recommendation surfaces
  const bestNext = [...list].filter(a => a.score).sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const easiest = [...list].filter(a => a.episodes).sort((a, b) => (a.episodes || 999) - (b.episodes || 999))[0];
  const sTier = list.filter(a => a.tier === 'S');
  const sGenres = new Set(sTier.flatMap(a => a.genres?.map(g => g.name) || []));
  const mostLikeS = list.find(a => a.tier !== 'S' && a.genres?.some(g => sGenres.has(g.name)));

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-warm)', color: 'var(--text-warm)',
    }}>
      <div style={{ padding: 'var(--space-lg) var(--space-md) 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h1 style={{ fontSize: 'var(--fs-heading)', fontWeight: 800 }}>My List</h1>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <button onClick={() => setView('grid')} style={{
              padding: '6px 12px', borderRadius: 'var(--radius-full)',
              background: view === 'grid' ? 'var(--sakura)' : 'var(--bg-warm-secondary)',
              color: view === 'grid' ? '#2D2420' : 'var(--text-warm-secondary)',
              fontSize: 'var(--fs-small)', fontWeight: 600,
            }}>Grid</button>
            <button onClick={() => setView('tierlist')} style={{
              padding: '6px 12px', borderRadius: 'var(--radius-full)',
              background: view === 'tierlist' ? 'var(--sakura)' : 'var(--bg-warm-secondary)',
              color: view === 'tierlist' ? '#2D2420' : 'var(--text-warm-secondary)',
              fontSize: 'var(--fs-small)', fontWeight: 600,
            }}>Tier List</button>
          </div>
        </div>

        {/* Recommendation surfaces */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', overflowX: 'auto' }}>
          <RecommendationCard title="Best Next Watch" subtitle={bestNext?.score ? `Score: ${bestNext.score}` : ''} anime={bestNext} />
          <RecommendationCard title="Quick Start" subtitle={easiest?.episodes ? `${easiest.episodes} episodes` : ''} anime={easiest} />
          <RecommendationCard title="Like Your S-Tier" subtitle="Genre match" anime={mostLikeS} />
        </div>

        {/* Tier filter tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', overflowX: 'auto' }}>
          <button
            onClick={() => setFilterTier(null)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: !filterTier ? 'var(--sakura)' : 'var(--bg-warm-secondary)',
              color: !filterTier ? '#2D2420' : 'var(--text-warm-secondary)',
              fontSize: 'var(--fs-small)', fontWeight: 600, flexShrink: 0,
            }}
          >All ({list.length})</button>
          {TIERS.map(t => {
            const count = list.filter(a => a.tier === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  background: filterTier === t ? TIER_COLORS[t].gradient : 'var(--bg-warm-secondary)',
                  color: filterTier === t ? TIER_COLORS[t].text : 'var(--text-warm-secondary)',
                  fontSize: 'var(--fs-small)', fontWeight: 600, flexShrink: 0,
                }}
              >{t} ({count})</button>
            );
          })}
          <button
            onClick={() => setFilterTier('unrated')}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: filterTier === 'unrated' ? 'var(--bg-warm-secondary)' : 'var(--bg-warm-secondary)',
              color: 'var(--text-warm-secondary)',
              fontSize: 'var(--fs-small)', fontWeight: 600, flexShrink: 0,
              border: filterTier === 'unrated' ? '2px solid var(--sakura)' : 'none',
            }}
          >Unrated ({list.filter(a => !a.tier).length})</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 var(--space-md)' }}>
        {view === 'grid' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-sm)',
          }}>
            {(filterTier === 'unrated' ? list.filter(a => !a.tier) : filtered).map(a => (
              <div key={a.mal_id} style={{ position: 'relative' }}>
                <div style={{
                  aspectRatio: '3/4', borderRadius: 'var(--radius-md)',
                  overflow: 'hidden', position: 'relative',
                }}>
                  <img
                    src={a.images?.jpg?.image_url}
                    alt={a.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)',
                  }} />
                  {a.tier && (
                    <div style={{
                      position: 'absolute', top: 4, left: 4,
                      padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                      background: TIER_COLORS[a.tier].gradient,
                      color: TIER_COLORS[a.tier].text,
                      fontSize: 'var(--fs-small)', fontWeight: 800,
                    }}>
                      {a.tier}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 4, left: 4, right: 4,
                    display: 'flex', gap: 2,
                  }}>
                    <button
                      onClick={() => setRatingAnime(a)}
                      style={{
                        flex: 1, padding: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--fs-micro)', fontWeight: 600,
                        color: 'var(--sakura)',
                      }}
                    >
                      Rate
                    </button>
                    <button
                      onClick={() => handleRemove(a.mal_id)}
                      style={{
                        padding: '4px 6px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--fs-micro)',
                        color: '#F44336',
                      }}
                    >
                      X
                    </button>
                  </div>
                </div>
                <p style={{
                  fontSize: 'var(--fs-micro)', fontWeight: 600,
                  marginTop: 4, lineHeight: 1.2,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {a.title_english || a.title}
                </p>
              </div>
            ))}
          </div>
        )}

        {view === 'tierlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {TIERS.map(tier => {
              const tierAnime = list.filter(a => a.tier === tier);
              return (
                <div key={tier} style={{
                  display: 'flex', gap: 'var(--space-sm)',
                  minHeight: 60,
                }}>
                  <div style={{
                    width: 48, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: TIER_COLORS[tier].gradient,
                    color: TIER_COLORS[tier].text,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 800, fontSize: 'var(--fs-subheading)',
                  }}>
                    <span>{tier}</span>
                    <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 500 }}>{TIER_LABELS[tier]}</span>
                  </div>
                  <div style={{
                    flex: 1, display: 'flex', gap: 'var(--space-xs)',
                    overflowX: 'auto', padding: 'var(--space-xs) 0',
                    minHeight: 60,
                    background: 'var(--bg-warm-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    alignItems: 'center',
                    paddingLeft: 'var(--space-xs)',
                  }}>
                    {tierAnime.length === 0 && (
                      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-warm-secondary)', padding: '0 var(--space-sm)' }}>
                        Drop anime here
                      </span>
                    )}
                    {tierAnime.map(a => (
                      <img
                        key={a.mal_id}
                        src={a.images?.jpg?.image_url}
                        alt={a.title}
                        title={a.title_english || a.title}
                        style={{
                          width: 40, height: 56, objectFit: 'cover',
                          borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                        }}
                        onClick={() => setRatingAnime(a)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-warm-secondary)' }}>
            <p style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>No anime saved yet</p>
            <p style={{ fontSize: 'var(--fs-caption)' }}>Swipe right on Discover to save anime here</p>
          </div>
        )}
        <div style={{ height: 20 }} />
      </div>

      {/* Rating modal */}
      {ratingAnime && (
        <div
          onClick={() => setRatingAnime(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-lg)',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-warm)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            width: '100%', maxWidth: 340,
          }}>
            <p style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700, marginBottom: 'var(--space-md)', textAlign: 'center' }}>
              Rate: {ratingAnime.title_english || ratingAnime.title}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {TIERS.map(tier => (
                <button
                  key={tier}
                  onClick={() => handleSetTier(ratingAnime.mal_id, tier)}
                  style={{
                    padding: '12px',
                    background: TIER_COLORS[tier].gradient,
                    color: TIER_COLORS[tier].text,
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700, fontSize: 'var(--fs-body)',
                    textAlign: 'left',
                    border: ratingAnime.tier === tier ? '2px solid var(--sakura)' : '2px solid transparent',
                  }}
                >
                  {tier} — {TIER_LABELS[tier]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
