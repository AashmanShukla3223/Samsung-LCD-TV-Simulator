/**
 * /api/ai-pick.js — Tri-Provider AI Channel Picker
 * Samsung C5000 LCD TV Simulator
 * ────────────────────────────────────────────────────────────────────────────
 *  Routes the channel-pick request to one or many of:
 *    • Gemini      (gemini-3.1-flash-lite)
 *    • Groq        (llama-3.3-70b-versatile)
 *    • OpenRouter  (free model: deepseek/deepseek-r1:free:free)
 *
 *  Modes (POST body: { mode: "..." }):
 *    "auto"       — server picks best mode based on configured keys (default)
 *    "groq"       — Groq only
 *    "gemini"     — Gemini only
 *    "openrouter" — OpenRouter only (free model by default)
 *    "race"       — Groq + Gemini in parallel, first SUCCESS wins
 *    "all"        — all three in parallel, first SUCCESS wins (most resilient)
 *    "both"       — Groq + Gemini, return Groq's pick + Gemini's reason
 *
 *  Server env vars (Vercel project settings → Environment Variables):
 *    GEMINI_API_KEY      — from https://aistudio.google.com/apikey
 *    GROQ_API_KEY        — from https://console.groq.com/keys
 *    OPENROUTER_API_KEY  — from https://openrouter.ai/keys
 *
 *  Client may ALSO send its own keys per-request via body:
 *    { user_keys: { gemini: "...", groq: "...", openrouter: "..." } }
 *  Client keys take precedence over server keys if provided.
 * ────────────────────────────────────────────────────────────────────────── */

export const config = {
  regions: ['bom1'], // Mumbai — low latency for Indian users
};

// ── Models ──────────────────────────────────────────────────────────────────
const GEMINI_MODEL     = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
const GROQ_MODEL       = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL = 'deepseek/deepseek-r1:free';
// Other free OpenRouter options:
//   'google/gemma-2-9b-it:free'
//   'mistralai/mistral-7b-instruct:free'
//   'nousresearch/hermes-3-llama-3.1-405b:free'  (smarter but slower)

// ── Site identity (for OpenRouter referrer ranking) ─────────────────────────
const SITE_URL  = 'https://samsung-lcd-tv.vercel.app';
const SITE_NAME = 'Samsung C5000 TV Simulator';

// ── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://samsung-lcd-tv.vercel.app',
  'https://project-78d0r.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function candidateNumber(c) {
  return c?.number ?? c?.channel_number ?? c?.doc?.number ?? null;
}

function formatCandidates(candidates) {
  return candidates.map((c, i) => {
    const number = candidateNumber(c) ?? '?';
    const name = c.name ?? c.title ?? c.doc?.name ?? '(untitled)';
    const meta = c.meta ?? c.doc?.meta ?? {};
    return `[${i + 1}] number=${number} | "${name}" (${meta.category ?? 'unknown'})\n` +
           `    tags: ${(meta.tags || []).join(', ')}\n` +
           `    about: ${meta.description ?? ''}`;
  }).join('\n');
}

function stripFences(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function buildPrompt(query, candidates, lang) {
  const langHint = lang === 'hi'
    ? "<one short sentence in Hindi (हिंदी में)>"
    : "<one short sentence, in the user's language>";
  return `You are the AI inside a Samsung C5000 LCD TV connected via HDMI 3 to a DishTV set-top box. The user just said:
"${query}"

Below are the top channels retrieved from the DishTV channel guide. Pick the SINGLE best match.

Channels:
${formatCandidates(candidates)}

Reply with STRICT JSON ONLY, no markdown:
{"channel_number": <number>, "reason": "${langHint}"}`;
}

function parsePickJSON(text, provider, model) {
  if (!text) throw new Error(`${provider}: empty content`);
  let pick;
  try {
    pick = JSON.parse(stripFences(text));
  } catch (e) {
    throw new Error(`${provider}: bad JSON: ${text.slice(0, 120)}`);
  }
  if (!pick || typeof pick !== 'object' || Array.isArray(pick)) {
    throw new Error(`${provider}: not a JSON object`);
  }
  if (!Number.isInteger(pick.channel_number) || typeof pick.reason !== 'string') {
    throw new Error(`${provider}: missing or invalid fields`);
  }
  return { ...pick, source: provider, model };
}

function validateInCandidates(pick, candidates) {
  const valid = candidates.map(candidateNumber).filter(n => n !== null);
  if (!valid.includes(pick.channel_number)) {
    throw new Error(`${pick.source}: picked ${pick.channel_number} not in candidates`);
  }
  return pick;
}

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra });
}

// ── Provider implementations ────────────────────────────────────────────────

async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
              `:generateContent?key=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.95, maxOutputTokens: 100 },
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Gemini HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  return parsePickJSON(text, 'gemini', GEMINI_MODEL);
}

async function callGroq(prompt, apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Groq HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return parsePickJSON(text, 'groq', GROQ_MODEL);
}

async function callOpenRouter(prompt, apiKey, model) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': SITE_URL,   // OpenRouter wants this for analytics/ranking
      'X-Title': SITE_NAME,
    },
    body: JSON.stringify({
      model: model || OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 100,
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return parsePickJSON(text, 'openrouter', model || OPENROUTER_MODEL);
}

// ── Mode handlers ───────────────────────────────────────────────────────────

function getKey(name, userKeys) {
  return (userKeys && userKeys[name]) || process.env[`${name.toUpperCase()}_API_KEY`] || null;
}

async function modeGroq(prompt, candidates, userKeys) {
  const key = getKey('groq', userKeys);
  if (!key) throw new Error('No Groq key (server env var GROQ_API_KEY missing and no client key)');
  return validateInCandidates(await callGroq(prompt, key), candidates);
}

async function modeGemini(prompt, candidates, userKeys) {
  const key = getKey('gemini', userKeys);
  if (!key) throw new Error('No Gemini key');
  return validateInCandidates(await callGemini(prompt, key), candidates);
}

async function modeOpenRouter(prompt, candidates, userKeys, modelOverride) {
  const key = getKey('openrouter', userKeys);
  if (!key) throw new Error('No OpenRouter key');
  return validateInCandidates(await callOpenRouter(prompt, key, modelOverride), candidates);
}

async function modeRace(prompt, candidates, userKeys) {
  // Groq + Gemini, first success wins (legacy behavior).
  const promises = [];
  const gKey = getKey('groq', userKeys);
  const mKey = getKey('gemini', userKeys);
  if (gKey) promises.push(callGroq(prompt, gKey).then(p => validateInCandidates(p, candidates)));
  if (mKey) promises.push(callGemini(prompt, mKey).then(p => validateInCandidates(p, candidates)));
  if (!promises.length) throw new Error('Race mode needs at least one of GROQ or GEMINI keys');
  return Promise.any(promises);
}

async function modeAll(prompt, candidates, userKeys) {
  // All three in parallel — first success wins. Most resilient.
  const promises = [];
  const gKey = getKey('groq', userKeys);
  const mKey = getKey('gemini', userKeys);
  const oKey = getKey('openrouter', userKeys);
  if (gKey) promises.push(callGroq(prompt, gKey).then(p => validateInCandidates(p, candidates)));
  if (mKey) promises.push(callGemini(prompt, mKey).then(p => validateInCandidates(p, candidates)));
  if (oKey) promises.push(callOpenRouter(prompt, oKey).then(p => validateInCandidates(p, candidates)));
  if (!promises.length) throw new Error('"all" mode needs at least one provider key');
  return Promise.any(promises);
}

async function modeBoth(prompt, candidates, userKeys) {
  // Groq + Gemini: wait for both, return Groq's pick + Gemini's reason if it's richer.
  const gKey = getKey('groq', userKeys);
  const mKey = getKey('gemini', userKeys);
  if (!gKey || !mKey) {
    throw new Error('"both" mode requires both GROQ and GEMINI keys');
  }
  const [g, m] = await Promise.allSettled([
    callGroq(prompt, gKey).then(p => validateInCandidates(p, candidates)),
    callGemini(prompt, mKey).then(p => validateInCandidates(p, candidates)),
  ]);
  const groq   = g.status === 'fulfilled' ? g.value : null;
  const gemini = m.status === 'fulfilled' ? m.value : null;
  if (!groq && !gemini) throw new Error('Both providers failed');
  if (!groq)   return gemini;
  if (!gemini) return groq;
  const useGeminiReason = gemini.reason.length > groq.reason.length * 1.2;
  return {
    channel_number: groq.channel_number,
    reason: useGeminiReason ? gemini.reason : groq.reason,
    source: 'both',
    model: `${GROQ_MODEL} + ${GEMINI_MODEL}`,
    detail: {
      groq:   { channel: groq.channel_number,   reason: groq.reason },
      gemini: { channel: gemini.channel_number, reason: gemini.reason },
      agreed: groq.channel_number === gemini.channel_number,
      reason_from: useGeminiReason ? 'gemini' : 'groq',
    },
  };
}

function resolveAutoMode(userKeys) {
  const has = name => !!getKey(name, userKeys);
  if (has('groq') && has('gemini') && has('openrouter')) return 'all';
  if (has('groq') && has('gemini')) return 'race';
  if (has('groq') && has('openrouter')) return 'all';
  if (has('gemini') && has('openrouter')) return 'all';
  if (has('groq'))       return 'groq';
  if (has('gemini'))     return 'gemini';
  if (has('openrouter')) return 'openrouter';
  return null;
}

// ── Valid modes ─────────────────────────────────────────────────────────────
const VALID_MODES = ['auto', 'groq', 'gemini', 'openrouter', 'race', 'all', 'both'];

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'Samsung C5000 Tri-AI Channel Picker',
      providers: {
        gemini:     { model: GEMINI_MODEL,     configured: !!process.env.GEMINI_API_KEY },
        groq:       { model: GROQ_MODEL,       configured: !!process.env.GROQ_API_KEY },
        openrouter: { model: OPENROUTER_MODEL, configured: !!process.env.OPENROUTER_API_KEY },
      },
      modes: ['auto', 'groq', 'gemini', 'openrouter', 'race', 'all', 'both'],
      default_mode: resolveAutoMode({}) || 'none',
      region: process.env.VERCEL_REGION || 'unknown',
      allowed_origins: ALLOWED_ORIGINS,
      usage: 'POST { query, candidates, lang?, mode?, user_keys?, openrouter_model? }',
      notes: 'user_keys override server env vars. openrouter_model defaults to deepseek/deepseek-r1:free.',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return sendError(res, 405, 'method_not_allowed', `Method ${req.method} not allowed.`);
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return sendError(res, 400, 'bad_json', 'Invalid JSON.');
  }

  const { query, candidates, lang = 'en', user_keys: userKeys = {}, openrouter_model: orModel } = body;
  let mode = (body.mode || 'auto').toLowerCase();

  if (typeof query !== 'string' || !query.trim()) {
    return sendError(res, 400, 'missing_query', 'Missing "query".');
  }
  if (query.length > 500) {
    return sendError(res, 400, 'query_too_long', 'Query too long (max 500).');
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return sendError(res, 400, 'missing_candidates', 'Missing "candidates" array.');
  }
  if (candidates.length > 20) {
    return sendError(res, 400, 'too_many_candidates', `Too many candidates (max 20).`);
  }

  if (!VALID_MODES.includes(mode)) {
    return sendError(res, 400, 'bad_mode', `Invalid mode "${mode}". Valid: ${VALID_MODES.join(', ')}`);
  }
  if (mode === 'auto') {
    const resolved = resolveAutoMode(userKeys);
    if (!resolved) {
      return sendError(res, 503, 'no_provider_configured',
        'No AI provider keys configured (server env vars missing and no user_keys provided).');
    }
    mode = resolved;
  }

  const prompt = buildPrompt(query, candidates, lang);
  const start = Date.now();

  try {
    let pick;
    switch (mode) {
      case 'groq':       pick = await modeGroq(prompt, candidates, userKeys); break;
      case 'gemini':     pick = await modeGemini(prompt, candidates, userKeys); break;
      case 'openrouter': pick = await modeOpenRouter(prompt, candidates, userKeys, orModel); break;
      case 'race':       pick = await modeRace(prompt, candidates, userKeys); break;
      case 'all':        pick = await modeAll(prompt, candidates, userKeys); break;
      case 'both':       pick = await modeBoth(prompt, candidates, userKeys); break;
    }
    return res.status(200).json({
      ...pick,
      mode_used: mode,
      latency_ms: Date.now() - start,
      region: process.env.VERCEL_REGION || 'unknown',
    });
  } catch (e) {
    const msg = e?.errors?.map(x => x?.message || String(x)).filter(Boolean).join(' | ') || e?.message || 'unknown error';
    // Config errors (missing keys, bad mode) → 400, provider errors → 502
    const isConfigError = /(no.*key|not configured|missing)/i.test(msg);
    return sendError(res, isConfigError ? 400 : 502, isConfigError ? 'config_error' : 'provider_error', msg, {
      mode_used: mode,
      latency_ms: Date.now() - start,
    });
  }
}
