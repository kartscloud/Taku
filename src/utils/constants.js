export const JIKAN_BASE = 'https://api.jikan.moe/v4';

export const JIKAN_RATE_LIMIT = 380;
export const JIKAN_FAST_RATE_LIMIT = 350;

export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const CACHE_MAX_ENTRIES = 200;
export const AUDIO_CACHE_MAX = 50;

export const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];

export const TIER_COLORS = {
  S: { gradient: 'linear-gradient(135deg, #E8E8F0, #C0C0CC)', text: '#2D2420' },
  A: { gradient: 'linear-gradient(135deg, #FFB7C5, #FF8FA3)', text: '#2D2420' },
  B: { gradient: 'linear-gradient(135deg, #8B7355, #A6885C)', text: '#F5EFE6' },
  C: { gradient: 'linear-gradient(135deg, #6B5E54, #7D6E63)', text: '#F5EFE6' },
  D: { gradient: 'linear-gradient(135deg, #4A3F3A, #5C504A)', text: '#F5EFE6' },
  F: { gradient: 'linear-gradient(135deg, #2D2420, #3D322D)', text: '#F5EFE6' },
};

export const TIER_LABELS = {
  S: 'Masterpiece',
  A: 'Excellent',
  B: 'Good',
  C: 'Mid',
  D: 'Bad',
  F: 'Unwatchable',
};

export const ARCHETYPES = {
  Action: { name: 'The Adrenaline Seeker', desc: 'You live for the fight scenes and power-ups' },
  Adventure: { name: 'The World Explorer', desc: 'You crave vast worlds and grand journeys' },
  Comedy: { name: 'The Vibe Chaser', desc: 'You watch anime to feel good' },
  Drama: { name: 'The Deep Feeler', desc: 'You want anime that makes you cry at 2am' },
  Fantasy: { name: 'The World Builder', desc: 'You love magic systems and lore dumps' },
  'Sci-Fi': { name: 'The Future Thinker', desc: 'You want anime that bends your brain' },
  Romance: { name: 'The Hopeless Romantic', desc: 'You ship everyone and everything' },
  Horror: { name: 'The Edge Walker', desc: 'You want anime that makes you uncomfortable' },
  Mystery: { name: 'The Detective', desc: 'You pause to theorize before the reveal' },
  'Slice of Life': { name: 'The Cozy Connoisseur', desc: 'You watch anime like a warm blanket' },
  Sports: { name: 'The Hype Machine', desc: 'You scream at training arcs' },
  Supernatural: { name: 'The Occult Scholar', desc: 'You want the weird and unexplained' },
};

export const GENRES_MAP = {
  1: 'Action', 2: 'Adventure', 4: 'Comedy', 8: 'Drama',
  10: 'Fantasy', 14: 'Horror', 7: 'Mystery', 22: 'Romance',
  24: 'Sci-Fi', 36: 'Slice of Life', 30: 'Sports', 37: 'Supernatural',
  46: 'Award Winning', 47: 'Gourmet', 48: 'Suspense',
};

export const SLANG_MAP = {
  'aura farming': { genres: [1, 10], min_score: 7.5, description: 'power fantasy with peak aesthetic' },
  'peak': { min_score: 8.5, order_by: 'score', description: 'highest rated anime' },
  'mid': { min_score: 5, max_score: 7, description: 'average anime' },
  'cozy': { genres: [36], description: 'slice of life comfort anime' },
  'depression anime': { genres: [8], keywords: 'psychological', description: 'emotionally devastating' },
  'brain rot': { genres: [4], order_by: 'popularity', description: 'mindless fun comedy' },
  'carried by animation': { studios: ['ufotable', 'MAPPA', 'Wit Studio'], description: 'visually stunning' },
  'goated': { min_score: 9, description: 'legendary tier anime' },
  'underrated': { min_score: 7, max_score: 8, order_by: 'score', description: 'hidden quality' },
  'banger': { min_score: 8, order_by: 'popularity', description: 'widely loved hits' },
  'isekai trash': { genres: [10, 2], keywords: 'isekai', description: 'transported to another world' },
  'shonen slop': { genres: [1], demographics: [27], description: 'battle shonen' },
  'seinen peak': { demographics: [42], min_score: 8, description: 'mature masterpieces' },
  'romcom': { genres: [22, 4], description: 'romantic comedy' },
  'edgy': { genres: [14, 8], rating: 'r17', description: 'dark and violent' },
  'wholesome': { genres: [36, 4], description: 'feel-good anime' },
  'mindfuck': { keywords: 'psychological thriller', description: 'plot twist heavy' },
  'comfort anime': { genres: [36, 4], description: 'relaxing watch' },
  'cry anime': { genres: [8, 22], description: 'guaranteed tears' },
  'hype': { genres: [1], min_score: 8, description: 'exciting action' },
  'dark': { genres: [14, 8], description: 'dark themes' },
  'chill': { genres: [36], description: 'relaxed pacing' },
};

export const CHARACTER_VOICES = {
  makima: {
    name: 'Makima',
    series: 'Chainsaw Man',
    gender: 'female',
    personality: 'Calm, commanding, subtly threatening. Speaks like everything is already decided. Never raises voice.',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    greeting: 'You came to me. Good. Tell me what you want to watch, and I will decide if you deserve it.',
  },
  zeroTwo: {
    name: 'Zero Two',
    series: 'Darling in the Franxx',
    gender: 'female',
    personality: 'Playful, teasing, calls the user "darling" frequently. Flirty but genuine.',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    greeting: 'Hey darling, looking for something to watch? I bet I can find something perfect for us.',
  },
  nobara: {
    name: 'Nobara',
    series: 'Jujutsu Kaisen',
    gender: 'female',
    personality: 'Blunt, aggressive, no-nonsense. Insults bad taste directly. Passionate about what she likes.',
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    greeting: 'Ugh, fine. Tell me what you want to watch and try not to have terrible taste.',
  },
  marin: {
    name: 'Marin',
    series: 'My Dress-Up Darling',
    gender: 'female',
    personality: 'Enthusiastic, hype, uses casual speech. Gets excited about recommendations.',
    voiceId: 'jBpfuIE2acCO8z3wKNLl',
    greeting: 'Oh my gosh, are we picking anime? I have SO many recommendations, this is gonna be amazing!',
  },
  yor: {
    name: 'Yor',
    series: 'Spy x Family',
    gender: 'female',
    personality: 'Polite, slightly awkward, occasionally says something accidentally threatening. Gentle.',
    voiceId: 'XB0fDUnXU5powFXDhCwa',
    greeting: 'Oh, hello! I would be happy to help you find something to watch. I am... quite good at finding things.',
  },
  gojo: {
    name: 'Gojo',
    series: 'Jujutsu Kaisen',
    gender: 'male',
    personality: 'Cocky, flexing, thinks everything he recommends is the best. Playfully arrogant.',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    greeting: 'Yo, you came to the strongest for anime recs? Smart move. I only deal in peak.',
  },
  levi: {
    name: 'Levi',
    series: 'Attack on Titan',
    gender: 'male',
    personality: 'Cold, minimum words, slightly disgusted by everything. Efficient. Never wastes a sentence.',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO',
    greeting: 'What do you want. Make it quick.',
  },
  spike: {
    name: 'Spike',
    series: 'Cowboy Bebop',
    gender: 'male',
    personality: 'Laid-back, cool, philosophical. References jazz and old movies. Effortlessly smooth.',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ',
    greeting: 'Hey. Looking for something to watch? I might know a thing or two. Pull up a seat.',
  },
  l: {
    name: 'L',
    series: 'Death Note',
    gender: 'male',
    personality: 'Analytical, uses probabilities and percentages. Quirky. States observations as deductions.',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: 'There is a 94% chance you are here because your current watchlist is insufficient. Let me analyze your taste.',
  },
  sukuna: {
    name: 'Sukuna',
    series: 'Jujutsu Kaisen',
    gender: 'male',
    personality: 'Arrogant, talks down to user, amused by their existence. Treats recommendations like bestowing gifts on mortals.',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    greeting: 'You dare ask the King of Curses for anime recommendations? Amusing. I will entertain this.',
  },
};

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
