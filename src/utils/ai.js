import { SLANG_MAP, CHARACTER_VOICES } from './constants';
import { getSettings, getSavedList } from './storage';

const SYSTEM_BASE = `You are Taku, an anime recommendation AI assistant. You speak briefly (max 3 sentences), confidently, and with deep anime knowledge. Never use emojis. You help users discover anime, manage their list, rate anime, and understand their taste.

You have access to the user's saved anime list and can perform actions via function calls.`;

function getCharacterPrompt(voiceKey) {
  const voice = CHARACTER_VOICES[voiceKey];
  if (!voice) return '';
  return `\n\nYou are speaking as ${voice.name} from ${voice.series}. ${voice.personality}`;
}

function buildTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'filter_discover',
        description: 'Filter the discover/swipe feed by genres, year, score, type, studio, or keywords',
        parameters: {
          type: 'object',
          properties: {
            genres: { type: 'array', items: { type: 'number' }, description: 'Genre IDs to filter by' },
            min_score: { type: 'number' },
            max_score: { type: 'number' },
            min_year: { type: 'number' },
            max_year: { type: 'number' },
            type: { type: 'string', enum: ['tv', 'movie', 'ova', 'special', 'ona'] },
            order_by: { type: 'string', enum: ['score', 'popularity', 'rank', 'favorites'] },
            keywords: { type: 'string' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_anime',
        description: 'Add an anime to the user saved list by title',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Anime title to search and add' },
            tier: { type: 'string', enum: ['S', 'A', 'B', 'C', 'D', 'F'], description: 'Optional tier rating' },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'remove_anime',
        description: 'Remove an anime from the saved list',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'rate_anime',
        description: 'Assign a tier rating to a saved anime',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            tier: { type: 'string', enum: ['S', 'A', 'B', 'C', 'D', 'F'] },
          },
          required: ['title', 'tier'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'find_similar',
        description: 'Find anime similar to a given title',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate to a screen in the app',
        parameters: {
          type: 'object',
          properties: {
            screen: { type: 'string', enum: ['discover', 'browse', 'search', 'charts', 'mylist', 'profile', 'settings'] },
          },
          required: ['screen'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'reset_filters',
        description: 'Reset discover feed back to default (no filters)',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'taste_query',
        description: 'Answer a question about the user taste profile',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The taste question to answer' },
          },
          required: ['query'],
        },
      },
    },
  ];
}

export function resolveSlang(text) {
  const lower = text.toLowerCase();
  for (const [slang, filters] of Object.entries(SLANG_MAP)) {
    if (lower.includes(slang)) {
      return { slang, filters };
    }
  }
  return null;
}

export async function chatWithTaku(messages, onAction) {
  const settings = getSettings();
  const savedList = getSavedList();

  const systemMsg = SYSTEM_BASE +
    getCharacterPrompt(settings.selectedVoice) +
    `\n\nUser's saved list (${savedList.length} anime): ${savedList.map(a => `${a.title || a.title_english}${a.tier ? ` [${a.tier}]` : ''}`).join(', ') || 'empty'}`;

  // If no API key, use regex fallback
  if (!settings.openaiKey) {
    return fallbackParse(messages[messages.length - 1].content, onAction);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemMsg }, ...messages],
        tools: buildTools(),
        tool_choice: 'auto',
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const msg = choice.message;

    // Handle function calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const results = [];
      for (const call of msg.tool_calls) {
        const args = JSON.parse(call.function.arguments);
        const result = await onAction(call.function.name, args);
        results.push(result);
      }
      // Get a follow-up response with function results
      const followUp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMsg },
            ...messages,
            msg,
            ...msg.tool_calls.map((call, i) => ({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(results[i]),
            })),
          ],
          max_tokens: 300,
        }),
      });

      if (!followUp.ok) throw new Error('Follow-up failed');
      const followData = await followUp.json();
      return followData.choices[0].message.content;
    }

    return msg.content;
  } catch (err) {
    console.error('AI error:', err);
    return fallbackParse(messages[messages.length - 1].content, onAction);
  }
}

function fallbackParse(text, onAction) {
  const lower = text.toLowerCase();

  // Check slang
  const slang = resolveSlang(text);
  if (slang) {
    onAction('filter_discover', slang.filters);
    return `Filtering for ${slang.slang} — ${slang.filters.description || 'applied'}.`;
  }

  // Reset
  if (lower.includes('reset') || lower.includes('clear filter')) {
    onAction('reset_filters', {});
    return 'Filters cleared. Back to the full feed.';
  }

  // Navigation
  const navMap = { discover: 'discover', browse: 'browse', search: 'search', chart: 'charts', list: 'mylist', profile: 'profile', setting: 'settings' };
  for (const [key, screen] of Object.entries(navMap)) {
    if (lower.includes(key)) {
      onAction('navigate', { screen });
      return `Taking you to ${screen}.`;
    }
  }

  // Genre filter
  const genreKeywords = {
    action: [1], adventure: [2], comedy: [4], drama: [8], fantasy: [10],
    horror: [14], mystery: [7], romance: [22], 'sci-fi': [24], 'sci fi': [24],
    'slice of life': [36], sports: [30], supernatural: [37],
  };
  for (const [keyword, genres] of Object.entries(genreKeywords)) {
    if (lower.includes(keyword)) {
      onAction('filter_discover', { genres });
      return `Filtering discover for ${keyword} anime.`;
    }
  }

  return "I got you, but I need an API key to fully understand that. Add your OpenAI key in Settings and I can do a lot more.";
}

export async function speakText(text, voiceKey) {
  const settings = getSettings();
  const voice = CHARACTER_VOICES[voiceKey || settings.selectedVoice];

  if (!settings.elevenLabsKey) {
    // Fallback to Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = voice?.gender === 'female' ? 1.2 : 0.8;
      speechSynthesis.speak(utterance);
    }
    return;
  }

  // Check audio cache
  const cacheKey = `${voiceKey}_${text.slice(0, 50)}`;
  const audioCache = storage.get('audio_cache', {});
  if (audioCache[cacheKey]) {
    const audio = new Audio(audioCache[cacheKey]);
    audio.play();
    return;
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': settings.elevenLabsKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) throw new Error('ElevenLabs error');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();

    // Cache as data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const cache = storage.get('audio_cache', {});
      const keys = Object.keys(cache);
      if (keys.length >= 50) {
        delete cache[keys[0]];
      }
      cache[cacheKey] = reader.result;
      storage.set('audio_cache', cache);
    };
    reader.readAsDataURL(blob);
  } catch {
    // Fallback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  }
}
