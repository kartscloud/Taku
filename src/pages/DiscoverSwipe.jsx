import React, { useState, useEffect, useRef, useCallback } from 'react';
import AnimeCard from '../components/AnimeCard';
import { getTopAnime, getAnimeByGenre, getAnimeSearch, clearQueues } from '../utils/jikan';
import { addToSaved, addSeenId, getSeenIds, getSavedList } from '../utils/storage';
import { GENRES_MAP } from '../utils/constants';

const POOL_TARGET = 100;
const GENRE_IDS = Object.keys(GENRES_MAP).map(Number);

function deduplicateFranchise(pool, existing) {
  const seenTitles = new Set();
  existing.forEach(a => {
    const base = (a.title || '').replace(/\s*(Season|Part|2nd|3rd|4th|:).*$/i, '').trim().toLowerCase();
    seenTitles.add(base);
  });
  return pool.filter(a => {
    const base = (a.title || '').replace(/\s*(Season|Part|2nd|3rd|4th|:).*$/i, '').trim().toLowerCase();
    if (seenTitles.has(base)) return false;
    seenTitles.add(base);
    return true;
  });
}

export default function DiscoverSwipe({ filters, setFilters }) {
  const [pool, setPool] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDir, setSwipeDir] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const pageRef = useRef(1);
  const genreIndexRef = useRef(0);
  const fetchingRef = useRef(false);
  const poolRef = useRef([]);

  const fetchPool = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const seen = getSeenIds();
    const saved = getSavedList();

    try {
      let newAnime = [];

      if (filters) {
        const params = { limit: '25', page: String(pageRef.current), order_by: filters.order_by || 'popularity', sort: 'asc' };
        if (filters.genres?.length) params.genres = filters.genres.join(',');
        if (filters.min_score) params.min_score = String(filters.min_score);
        if (filters.max_score) params.max_score = String(filters.max_score);
        if (filters.min_year) params.start_date = `${filters.min_year}-01-01`;
        if (filters.max_year) params.end_date = `${filters.max_year}-12-31`;
        if (filters.type) params.type = filters.type;
        if (filters.keywords) params.q = filters.keywords;
        const data = await getAnimeSearch(params);
        newAnime = data.data || [];
      } else {
        if (pageRef.current <= 4) {
          const data = await getTopAnime(pageRef.current);
          newAnime = data.data || [];
        } else {
          const genreId = GENRE_IDS[genreIndexRef.current % GENRE_IDS.length];
          const genrePage = Math.floor(genreIndexRef.current / GENRE_IDS.length) + 1;
          const data = await getAnimeByGenre(genreId, genrePage);
          newAnime = data.data || [];
          genreIndexRef.current++;
        }
      }

      const filtered = newAnime.filter(a => !seen.has(a.mal_id));
      const deduped = deduplicateFranchise(filtered, [...poolRef.current, ...saved]);

      poolRef.current = [...poolRef.current, ...deduped];
      setPool([...poolRef.current]);
      pageRef.current++;
    } catch (err) {
      console.error('Fetch pool error:', err);
    }

    fetchingRef.current = false;
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    clearQueues();
    poolRef.current = [];
    setPool([]);
    setCurrentIndex(0);
    pageRef.current = 1;
    genreIndexRef.current = 0;
    setLoading(true);
    fetchPool();
  }, [filters]);

  useEffect(() => {
    if (poolRef.current.length - currentIndex < 10) {
      fetchPool();
    }
  }, [currentIndex, fetchPool]);

  const swipe = (direction) => {
    const anime = pool[currentIndex];
    if (!anime) return;

    setSwipeDir(direction);
    addSeenId(anime.mal_id);

    if (direction === 'right') {
      addToSaved(anime);
    }
    // up = mark as watched (also save)
    if (direction === 'up') {
      addToSaved(anime);
    }

    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex(prev => prev + 1);
    }, 250);
  };

  const handleTouchStart = (e) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    setTouchDelta({
      x: e.touches[0].clientX - touchStart.x,
      y: e.touches[0].clientY - touchStart.y,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    const threshold = 80;
    if (touchDelta.y < -threshold) {
      swipe('up');
    } else if (touchDelta.x > threshold) {
      swipe('right');
    } else if (touchDelta.x < -threshold) {
      swipe('left');
    }
    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
  };

  const anime = pool[currentIndex];

  const getCardTransform = () => {
    if (swipeDir === 'left') return 'translateX(-120%) rotate(-15deg)';
    if (swipeDir === 'right') return 'translateX(120%) rotate(15deg)';
    if (swipeDir === 'up') return 'translateY(-120%)';
    if (touchDelta.x || touchDelta.y) {
      return `translate(${touchDelta.x}px, ${Math.min(0, touchDelta.y)}px) rotate(${touchDelta.x * 0.05}deg)`;
    }
    return 'none';
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: 'var(--space-md)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-md)', flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 'var(--fs-subheading)', fontWeight: 700 }}>Discover</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {filters && (
            <button
              onClick={() => setFilters(null)}
              style={{
                padding: '6px 14px',
                background: 'var(--sakura)',
                color: '#2D2420',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--fs-small)',
                fontWeight: 600,
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {filters && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-dark-card)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--fs-small)',
          color: 'var(--sakura)',
          marginBottom: 'var(--space-md)',
          flexShrink: 0,
        }}>
          Filtered feed active
        </div>
      )}

      {/* Card area */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
      }}>
        {loading && !anime && (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text-dark-secondary)',
          }}>
            Loading anime...
          </div>
        )}

        {anime && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'absolute', inset: 0,
              transform: getCardTransform(),
              transition: swipeDir ? 'transform 0.25s ease' : 'none',
            }}
          >
            <AnimeCard anime={anime} />
            {/* Swipe indicators */}
            {touchDelta.x > 40 && (
              <div style={{
                position: 'absolute', top: '50%', left: 20,
                transform: 'translateY(-50%)',
                padding: '8px 16px',
                background: 'rgba(76,175,80,0.9)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: 'var(--fs-body)',
              }}>
                SAVE
              </div>
            )}
            {touchDelta.x < -40 && (
              <div style={{
                position: 'absolute', top: '50%', right: 20,
                transform: 'translateY(-50%)',
                padding: '8px 16px',
                background: 'rgba(244,67,54,0.9)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: 'var(--fs-body)',
              }}>
                SKIP
              </div>
            )}
            {touchDelta.y < -40 && (
              <div style={{
                position: 'absolute', top: 20, left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 16px',
                background: 'rgba(33,150,243,0.9)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: 'var(--fs-body)',
              }}>
                WATCHED
              </div>
            )}
          </div>
        )}

        {!anime && !loading && (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text-dark-secondary)',
            flexDirection: 'column', gap: 'var(--space-md)',
          }}>
            <p>No more anime to show</p>
            <button
              onClick={() => { setFilters(null); }}
              style={{
                padding: '10px 20px', background: 'var(--sakura)',
                color: '#2D2420', borderRadius: 'var(--radius-full)',
                fontWeight: 600, fontSize: 'var(--fs-body)',
              }}
            >
              Reset & Refresh
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {anime && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)',
          paddingTop: 'var(--space-md)', flexShrink: 0,
        }}>
          <button
            onClick={() => swipe('left')}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--bg-dark-card)',
              fontSize: 'var(--fs-body-lg)', fontWeight: 700,
              color: '#F44336',
              border: '2px solid rgba(244,67,54,0.3)',
            }}
          >
            X
          </button>
          <button
            onClick={() => swipe('up')}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--bg-dark-card)',
              fontSize: 'var(--fs-caption)', fontWeight: 700,
              color: '#2196F3',
              border: '2px solid rgba(33,150,243,0.3)',
            }}
          >
            SEEN
          </button>
          <button
            onClick={() => swipe('right')}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--bg-dark-card)',
              fontSize: 'var(--fs-body-lg)', fontWeight: 700,
              color: '#4CAF50',
              border: '2px solid rgba(76,175,80,0.3)',
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
