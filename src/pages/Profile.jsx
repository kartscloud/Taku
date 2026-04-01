import React, { useState, useRef } from 'react';
import { getSavedList, getAuth } from '../utils/storage';
import { ARCHETYPES, TIERS, TIER_COLORS, TIER_LABELS } from '../utils/constants';
import { useNavigate } from 'react-router-dom';

function getArchetype(list) {
  const genreCount = {};
  list.forEach(a => {
    (a.genres || []).forEach(g => {
      genreCount[g.name] = (genreCount[g.name] || 0) + 1;
    });
  });
  const top = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];
  if (!top) return { name: 'The Newcomer', desc: 'Your taste is still forming' };
  return ARCHETYPES[top[0]] || { name: 'The Eclectic', desc: `Deep into ${top[0]}` };
}

function getGenreBreakdown(list) {
  const genreCount = {};
  list.forEach(a => {
    (a.genres || []).forEach(g => {
      genreCount[g.name] = (genreCount[g.name] || 0) + 1;
    });
  });
  return Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

export default function Profile() {
  const list = getSavedList();
  const auth = getAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const archetype = getArchetype(list);
  const genres = getGenreBreakdown(list);
  const rated = list.filter(a => a.tier);
  const sTier = list.filter(a => a.tier === 'S');
  const avgScore = list.filter(a => a.score).reduce((s, a) => s + a.score, 0) / (list.filter(a => a.score).length || 1);
  const totalEpisodes = list.reduce((s, a) => s + (a.episodes || 0), 0);
  const watchTimeHrs = Math.round(totalEpisodes * 24 / 60);
  const top5 = [...list].sort((a, b) => {
    const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
    return (tierOrder[a.tier] ?? 6) - (tierOrder[b.tier] ?? 6) || (b.score || 0) - (a.score || 0);
  }).slice(0, 5);

  const controversial = sTier.find(a => a.score && a.score < 7.5);
  const maxGenreCount = genres[0]?.[1] || 1;

  const generateShareCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1A1118';
    ctx.fillRect(0, 0, 1080, 1920);

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, 'rgba(255,183,197,0.1)');
    grad.addColorStop(1, 'rgba(26,17,24,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Title
    ctx.fillStyle = '#FFB7C5';
    ctx.font = '800 72px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Taku', 540, 160);

    ctx.fillStyle = '#A89B94';
    ctx.font = '500 32px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Anime Taste Engine', 540, 210);

    // Username + archetype
    ctx.fillStyle = '#F5EFE6';
    ctx.font = '700 48px Plus Jakarta Sans, sans-serif';
    ctx.fillText(auth?.username || 'Anon', 540, 340);

    ctx.fillStyle = '#FFB7C5';
    ctx.font = '600 36px Plus Jakarta Sans, sans-serif';
    ctx.fillText(archetype.name, 540, 400);

    ctx.fillStyle = '#A89B94';
    ctx.font = '400 28px Plus Jakarta Sans, sans-serif';
    ctx.fillText(archetype.desc, 540, 450);

    // Stats
    const stats = [
      [`${list.length}`, 'Saved'],
      [`${rated.length}`, 'Rated'],
      [`${sTier.length}`, 'S-Tier'],
      [`${watchTimeHrs}h`, 'Watch Time'],
    ];
    stats.forEach(([val, label], i) => {
      const x = 140 + i * 220;
      ctx.fillStyle = '#F5EFE6';
      ctx.font = '800 52px Plus Jakarta Sans, sans-serif';
      ctx.fillText(val, x, 580);
      ctx.fillStyle = '#A89B94';
      ctx.font = '500 24px Plus Jakarta Sans, sans-serif';
      ctx.fillText(label, x, 620);
    });

    // Top 5
    ctx.fillStyle = '#FFB7C5';
    ctx.font = '700 32px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Top 5', 80, 720);

    top5.forEach((a, i) => {
      ctx.fillStyle = '#F5EFE6';
      ctx.font = '600 28px Plus Jakarta Sans, sans-serif';
      ctx.fillText(`${i + 1}. ${(a.title_english || a.title).slice(0, 35)}`, 80, 780 + i * 50);
    });

    // Genre bars
    ctx.fillStyle = '#FFB7C5';
    ctx.font = '700 32px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Genre DNA', 80, 1100);

    genres.slice(0, 5).forEach(([name, count], i) => {
      const y = 1150 + i * 60;
      const barWidth = (count / maxGenreCount) * 600;
      ctx.fillStyle = '#A89B94';
      ctx.font = '500 24px Plus Jakarta Sans, sans-serif';
      ctx.fillText(name, 80, y + 20);
      ctx.fillStyle = 'rgba(255,183,197,0.3)';
      ctx.fillRect(300, y, 600, 30);
      ctx.fillStyle = '#FFB7C5';
      ctx.fillRect(300, y, barWidth, 30);
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A89B94';
    ctx.font = '400 24px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Generated with Taku', 540, 1840);

    // Download
    const link = document.createElement('a');
    link.download = `taku-taste-${auth?.username || 'card'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      background: 'var(--bg-warm)', color: 'var(--text-warm)',
    }}>
      <div style={{ padding: 'var(--space-lg) var(--space-md)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFB7C5, #FF8FA3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-md)',
            fontSize: 'var(--fs-title)', fontWeight: 800, color: '#2D2420',
          }}>
            {(auth?.username || 'A')[0].toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'var(--fs-heading)', fontWeight: 800 }}>
            {auth?.username || 'Anonymous'}
          </h1>
          <p style={{
            fontSize: 'var(--fs-body)', fontWeight: 600,
            color: 'var(--sakura)', marginTop: 4,
          }}>
            {archetype.name}
          </p>
          <p style={{
            fontSize: 'var(--fs-caption)', color: 'var(--text-warm-secondary)',
            marginTop: 2,
          }}>
            {archetype.desc}
          </p>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)',
        }}>
          {[
            { label: 'Saved', value: list.length },
            { label: 'Rated', value: rated.length },
            { label: 'S-Tier', value: sTier.length },
            { label: 'Watch Time', value: `${watchTimeHrs}h` },
            { label: 'Avg Score', value: avgScore.toFixed(1) },
            { label: 'Top Genre', value: genres[0]?.[0] || '-' },
          ].map(s => (
            <div key={s.label} style={{
              padding: 'var(--space-md)', background: 'var(--bg-warm-secondary)',
              borderRadius: 'var(--radius-md)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--fs-subheading)', fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Genre breakdown */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Genre DNA
          </h3>
          {genres.map(([name, count]) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
              marginBottom: 'var(--space-sm)',
            }}>
              <span style={{ fontSize: 'var(--fs-caption)', width: 90, flexShrink: 0 }}>{name}</span>
              <div style={{
                flex: 1, height: 16, background: 'var(--bg-warm-secondary)',
                borderRadius: 'var(--radius-full)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(count / maxGenreCount) * 100}%`, height: '100%',
                  background: 'linear-gradient(90deg, #FFB7C5, #FF8FA3)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.5s',
                }} />
              </div>
              <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)', width: 24, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Top 5 */}
        {top5.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ fontSize: 'var(--fs-body-lg)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
              Top 5
            </h3>
            {top5.map((a, i) => (
              <div key={a.mal_id} style={{
                display: 'flex', gap: 'var(--space-md)', alignItems: 'center',
                padding: 'var(--space-sm) 0',
              }}>
                <span style={{
                  width: 24, fontWeight: 800, fontSize: 'var(--fs-body)',
                  color: i === 0 ? '#C9A84C' : 'var(--text-warm-secondary)',
                }}>{i + 1}</span>
                <img
                  src={a.images?.jpg?.image_url}
                  alt={a.title}
                  style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>{a.title_english || a.title}</p>
                </div>
                {a.tier && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                    background: TIER_COLORS[a.tier].gradient,
                    color: TIER_COLORS[a.tier].text,
                    fontSize: 'var(--fs-small)', fontWeight: 700,
                  }}>{a.tier}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Controversial pick */}
        {controversial && (
          <div style={{
            padding: 'var(--space-md)', background: 'var(--bg-warm-secondary)',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)',
          }}>
            <p style={{ fontSize: 'var(--fs-small)', color: 'var(--text-warm-secondary)', marginBottom: 4 }}>
              Your Controversial Pick
            </p>
            <p style={{ fontSize: 'var(--fs-body)', fontWeight: 700 }}>
              {controversial.title_english || controversial.title}
            </p>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-warm-secondary)' }}>
              You rated it S-tier but MAL says {controversial.score}
            </p>
          </div>
        )}

        {/* Share & Settings */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
          <button
            onClick={generateShareCard}
            style={{
              flex: 1, padding: '14px',
              background: 'linear-gradient(135deg, #FFB7C5, #FF8FA3)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700, fontSize: 'var(--fs-body)',
              color: '#2D2420',
            }}
          >
            Share My Taste
          </button>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '14px 20px',
              background: 'var(--bg-warm-secondary)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 'var(--fs-body)',
              color: 'var(--text-warm)',
            }}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
