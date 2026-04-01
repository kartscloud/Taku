import { JIKAN_BASE, JIKAN_RATE_LIMIT, JIKAN_FAST_RATE_LIMIT, CACHE_TTL, CACHE_MAX_ENTRIES } from './constants';
import { storage } from './storage';

class RateLimitedQueue {
  constructor(interval) {
    this.interval = interval;
    this.queue = [];
    this.processing = false;
    this.lastCall = 0;
  }

  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastCall;
      if (elapsed < this.interval) {
        await new Promise(r => setTimeout(r, this.interval - elapsed));
      }
      const { fn, resolve, reject } = this.queue.shift();
      this.lastCall = Date.now();
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue.forEach(({ reject }) => reject(new Error('Queue cleared')));
    this.queue = [];
  }
}

const jRL = new RateLimitedQueue(JIKAN_RATE_LIMIT);
const jFast = new RateLimitedQueue(JIKAN_FAST_RATE_LIMIT);

function getCacheKey(url) {
  return url.replace(JIKAN_BASE, '');
}

function getCache(key) {
  const cache = storage.get('api_cache', {});
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    delete cache[key];
    storage.set('api_cache', cache);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  const cache = storage.get('api_cache', {});
  const keys = Object.keys(cache);
  if (keys.length >= CACHE_MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => cache[a].ts - cache[b].ts);
    sorted.slice(0, Math.ceil(keys.length / 4)).forEach(k => delete cache[k]);
  }
  cache[key] = { data, ts: Date.now() };
  storage.set('api_cache', cache);
}

async function fetchJikan(path, fast = false) {
  const url = `${JIKAN_BASE}${path}`;
  const cacheKey = getCacheKey(url);
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const queue = fast ? jFast : jRL;
  const data = await queue.enqueue(async () => {
    const res = await fetch(url);
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 1000));
      const retry = await fetch(url);
      if (!retry.ok) throw new Error(`Jikan ${retry.status}`);
      return retry.json();
    }
    if (!res.ok) throw new Error(`Jikan ${res.status}`);
    return res.json();
  });

  setCache(cacheKey, data);
  return data;
}

export async function getTopAnime(page = 1, filter = '') {
  const params = filter ? `&filter=${filter}` : '';
  return fetchJikan(`/top/anime?page=${page}&limit=25${params}`);
}

export async function getAnimeByGenre(genreId, page = 1) {
  return fetchJikan(`/anime?genres=${genreId}&order_by=popularity&sort=asc&page=${page}&limit=25`);
}

export async function searchAnime(query, page = 1) {
  return fetchJikan(`/anime?q=${encodeURIComponent(query)}&page=${page}&limit=25`, true);
}

export async function getAnimeById(id) {
  return fetchJikan(`/anime/${id}/full`);
}

export async function getAnimeRecommendations(id) {
  return fetchJikan(`/anime/${id}/recommendations`);
}

export async function getSeasonNow(page = 1) {
  return fetchJikan(`/seasons/now?page=${page}&limit=25`);
}

export async function getSeasonUpcoming(page = 1) {
  return fetchJikan(`/seasons/upcoming?page=${page}&limit=25`);
}

export async function getSchedules(day) {
  return fetchJikan(`/schedules?filter=${day.toLowerCase()}`);
}

export async function getAnimeSearch(params) {
  const query = new URLSearchParams(params).toString();
  return fetchJikan(`/anime?${query}`);
}

export function clearQueues() {
  jRL.clear();
  jFast.clear();
}

export { jRL, jFast };
