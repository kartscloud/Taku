import React from 'react';

export default function AnimeCard({ anime, style, onAction }) {
  const title = anime.title_english || anime.title;
  const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
  const genres = anime.genres?.map(g => g.name).join(', ') || '';
  const year = anime.year || anime.aired?.prop?.from?.year || '';
  const episodes = anime.episodes ? `${anime.episodes} ep` : '';
  const studio = anime.studios?.[0]?.name || '';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: 'var(--shadow-card)',
      ...style,
    }}>
      {image && (
        <img
          src={image}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(26,17,24,0.95) 0%, rgba(26,17,24,0.6) 40%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 'var(--space-lg)',
      }}>
        <h2 style={{
          fontSize: 'var(--fs-heading)',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: 'var(--space-sm)',
        }}>
          {title}
        </h2>
        <div style={{
          display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap',
          fontSize: 'var(--fs-caption)', color: 'var(--text-dark-secondary)',
          marginBottom: 'var(--space-sm)',
        }}>
          {year && <span>{year}</span>}
          {episodes && <span>{episodes}</span>}
          {studio && <span>{studio}</span>}
        </div>
        {anime.score && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--fs-caption)', fontWeight: 700,
            color: 'var(--gold)',
            marginBottom: 'var(--space-sm)',
          }}>
            * {anime.score}
          </div>
        )}
        <div style={{
          fontSize: 'var(--fs-small)',
          color: 'var(--sakura)',
          marginBottom: 'var(--space-sm)',
        }}>
          {genres}
        </div>
        {anime.synopsis && (
          <p style={{
            fontSize: 'var(--fs-caption)',
            color: 'var(--text-dark-secondary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {anime.synopsis}
          </p>
        )}
      </div>
    </div>
  );
}
