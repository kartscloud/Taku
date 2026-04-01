const PREFIX = 'taku_';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full — evict oldest cache entries
      this.evictCache();
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch { /* give up */ }
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  evictCache() {
    const cacheKey = PREFIX + 'api_cache';
    const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
    const entries = Object.entries(cache);
    if (entries.length === 0) return;
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const half = Math.ceil(entries.length / 2);
    const kept = Object.fromEntries(entries.slice(half));
    localStorage.setItem(cacheKey, JSON.stringify(kept));
  },
};

// User data helpers
export function getSavedList() {
  return storage.get('saved_list', []);
}

export function setSavedList(list) {
  storage.set('saved_list', list);
}

export function addToSaved(anime) {
  const list = getSavedList();
  if (!list.find(a => a.mal_id === anime.mal_id)) {
    list.push({ ...anime, tier: null, savedAt: Date.now() });
    setSavedList(list);
  }
  return list;
}

export function removeFromSaved(malId) {
  const list = getSavedList().filter(a => a.mal_id !== malId);
  setSavedList(list);
  return list;
}

export function setTier(malId, tier) {
  const list = getSavedList();
  const item = list.find(a => a.mal_id === malId);
  if (item) {
    item.tier = tier;
    setSavedList(list);
  }
  return list;
}

export function getSeenIds() {
  return new Set(storage.get('seen_ids', []));
}

export function addSeenId(id) {
  const seen = storage.get('seen_ids', []);
  if (!seen.includes(id)) {
    seen.push(id);
    storage.set('seen_ids', seen);
  }
}

export function getSettings() {
  return storage.get('settings', {
    openaiKey: '',
    elevenLabsKey: '',
    selectedVoice: 'gojo',
    autoSpeak: false,
    username: '',
  });
}

export function updateSettings(partial) {
  const current = getSettings();
  storage.set('settings', { ...current, ...partial });
}

export function getAuth() {
  return storage.get('auth', null);
}

export function setAuth(auth) {
  storage.set('auth', auth);
}
