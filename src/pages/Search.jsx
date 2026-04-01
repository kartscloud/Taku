import React, { useState, useEffect, useRef } from 'react';
import { searchAnime, getSchedules } from '../utils/jikan';
import { addToSaved } from '../utils/storage';
import { DAYS_OF_WEEK } from '../utils/constants';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('search'); // search | schedule
  const [scheduleDay, setScheduleDay] = useState(DAYS_OF_WEEK[new Date().getDay()]);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAnime(query);
        setResults(data.data || []);
      } catch (err) {
        console.error('Search error:', err);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (tab !== 'schedule') return;
    async function loadSchedule() {
      setScheduleLoading(true);
      try {
        const data = await getSchedules(scheduleDay);
        setSchedule(data.data || []);
      } catch (err) {
        console.error('Schedule error:', err);
      }
      setScheduleLoading(false);
    }
    loadSchedule();
  }, [tab, scheduleDay]);

  const convertJSTtoLocal = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const jst = new Date();
      jst.setUTCHours(h - 9, m, 0, 0);
      return jst.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 'var(--space-sm)',
        padding: 'var(--space-md) var(--space-md) 0',
        flexShrink: 0,
      }}>
        {['search', 'schedule'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? 'var(--sakura)' : 'var(--bg-dark-card)',
              color: tab === t ? '#2D2420' : 'var(--text-dark-secondary)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--fs-caption)', fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <div style={{ padding: 'var(--space-md)', flexShrink: 0 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search anime, genres, studios..."
              style={{
                width: '100%', padding: '12px 18px',
                background: 'var(--bg-dark-card)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--fs-body)',
                color: 'var(--text-dark)',
              }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 var(--space-md)' }}>
            {loading && <p style={{ color: 'var(--text-dark-secondary)', textAlign: 'center', padding: 'var(--space-lg)' }}>Searching...</p>}
            {results.map(a => (
              <div key={a.mal_id} style={{
                display: 'flex', gap: 'var(--space-md)',
                padding: 'var(--space-md) 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <img
                  src={a.images?.jpg?.image_url}
                  alt={a.title}
                  style={{ width: 60, height: 85, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                  loading="lazy"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--fs-body)', fontWeight: 600, marginBottom: 2 }}>
                    {a.title_english || a.title}
                  </p>
                  <p style={{ fontSize: 'var(--fs-small)', color: 'var(--text-dark-secondary)', marginBottom: 4 }}>
                    {a.genres?.map(g => g.name).join(', ')}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    {a.score && (
                      <span style={{ fontSize: 'var(--fs-small)', color: 'var(--gold)', fontWeight: 700 }}>
                        {a.score}
                      </span>
                    )}
                    {a.episodes && (
                      <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text-dark-secondary)' }}>
                        {a.episodes} ep
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => addToSaved(a)}
                  style={{
                    alignSelf: 'center', padding: '8px 14px',
                    background: 'var(--bg-dark-card)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--fs-small)', fontWeight: 600,
                    color: 'var(--sakura)',
                    border: '1px solid rgba(255,183,197,0.2)',
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'schedule' && (
        <>
          <div style={{
            display: 'flex', gap: 'var(--space-xs)',
            padding: 'var(--space-md)',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                onClick={() => setScheduleDay(day)}
                style={{
                  padding: '6px 12px',
                  background: scheduleDay === day ? 'var(--sakura)' : 'var(--bg-dark-card)',
                  color: scheduleDay === day ? '#2D2420' : 'var(--text-dark-secondary)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--fs-small)', fontWeight: 600,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 var(--space-md)' }}>
            {scheduleLoading && <p style={{ color: 'var(--text-dark-secondary)', textAlign: 'center', padding: 'var(--space-lg)' }}>Loading schedule...</p>}
            {schedule.map(a => (
              <div key={a.mal_id} style={{
                display: 'flex', gap: 'var(--space-md)',
                padding: 'var(--space-md) 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <img
                  src={a.images?.jpg?.image_url}
                  alt={a.title}
                  style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                  loading="lazy"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>
                    {a.title_english || a.title}
                  </p>
                  <p style={{ fontSize: 'var(--fs-small)', color: 'var(--text-dark-secondary)' }}>
                    {a.broadcast?.time ? convertJSTtoLocal(a.broadcast.time) : 'TBA'} — {a.genres?.map(g => g.name).join(', ')}
                  </p>
                  {a.score && (
                    <span style={{ fontSize: 'var(--fs-small)', color: 'var(--gold)', fontWeight: 700 }}>{a.score}</span>
                  )}
                </div>
                <button
                  onClick={() => addToSaved(a)}
                  style={{
                    alignSelf: 'center', padding: '6px 10px',
                    background: 'var(--bg-dark-card)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--fs-small)', color: 'var(--sakura)',
                    flexShrink: 0,
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
