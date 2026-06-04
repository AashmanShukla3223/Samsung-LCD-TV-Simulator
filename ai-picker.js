/* =====================================================================
 *  Samsung C5000 — AI Channel Picker (RAG)
 *  ---------------------------------------------------------------------
 *  Drop-in module. Loaded AFTER Samsung_TV.html's inline script so it
 *  has access to:
 *    - window.dishChannels            (defined below + read from page)
 *    - window.AI_CHANNEL_META         (rich metadata per channel)
 *    - the DOM (#dishVideo, #dishChannelInfo, etc.)
 *    - the global helpers: showToast, loadDishVideo, saveSettings
 *
 *  Pipeline:
 *    1. Build TF-IDF index over the channel metadata
 *    2. On query: cosine top-K candidates
 *    3. If Gemini key set → ask Gemini to pick one + give a reason
 *       Else: retrieval-only mode (returns top match)
 *    4. Tune DishTV to that channel via the existing loadDishVideo flow
 *
 *  No backend. Key lives in localStorage only. Toggle in the TV Menu.
 * ===================================================================*/

(function () {
  'use strict';

  // ── 0. Boot — run as soon as the DOM is ready ───────────────────────
  //  We're loaded at the END of <body>, AFTER the host's inline script,
  //  so the host globals (dishChannels, loadDishVideo, showToast) are
  //  already defined in the shared classic-script lexical environment.
  //  Inject the UI immediately; defer the channel-tuning helpers behind
  //  safe `typeof` checks at the point of use.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    if (window.__AI_PICKER_BOOTED__) return;  // guard against double-init
    window.__AI_PICKER_BOOTED__ = true;

    // ── 1. RAG knowledge base ────────────────────────────────────────
    //  Indexed by the channel NUMBER (parsed from dishChannels[i].name).
    //  Tags + description = the document RAG retrieves over.
    //  Edit freely — richer text = smarter picks.
    const META = {
       121: {
        category: "general news",
        network: "AajTak",
        show: "Main Bulletin",
        edition: "Daily Headlines",
        disambiguator: "general daily news headlines samachar",
        tags: ["news", "headlines", "samachar", "general", "aaj tak", "daily"],
        description: "AajTak general news bulletin — daily headlines from India."
      },
       122: {
        category: "entertainment",
        network: "AajTak",
        show: "Saas Bahu aur Betiyaan",
        edition: "Soap & Gossip",
        disambiguator: "soap opera serial bollywood entertainment gossip",
        tags: ["saas bahu", "betiyaan", "soap", "tv serial", "bollywood", "celebrity", "entertainment", "gossip", "manoranjan"],
        description: "Saas Bahu aur Betiyaan — TV soap, serial drama and Bollywood entertainment gossip."
      },
       123: {
        category: "investigation",
        network: "AajTak",
        show: "Special Report",
        edition: "Prime Time Investigation",
        disambiguator: "8:30 PM long-form investigative journalism",
        tags: ["special report", "investigation", "8:30 pm", "prime time", "in depth", "ground report", "explainer"],
        description: "AajTak Special Report 8:30PM Edition — long-form investigative journalism."
      },
       124: {
        category: "morning news",
        network: "AajTak",
        show: "Aaj Subah",
        edition: "Morning Round-up",
        disambiguator: "10 AM morning breakfast news",
        tags: ["morning", "subah", "10am", "breakfast news", "early", "wake up", "subah ki khabar"],
        description: "AajTak Aaj Subah 10AM Edition — morning news round-up."
      },
       125: {
        category: "politics",
        network: "AajTak",
        show: "e-Agenda",
        edition: "Political Summit 2020",
        disambiguator: "political agenda debate policy leaders",
        tags: ["politics", "agenda", "2020", "policy", "debate", "panel", "e-agenda", "leaders"],
        description: "AajTak 2020 e-Agenda Edition — political agenda summit, policy debates with leaders."
      },
       126: {
        category: "debate",
        network: "AajTak",
        show: "Halla Bol",
        edition: "Evening Debate Edition",
        disambiguator: "6:30 PM prime time high-voltage debate",
        tags: ["halla bol", "debate", "6:30 pm", "anchor", "shouting match", "panel discussion", "evening", "opinion", "prime time", "evening debate"],
        description: "AajTak Halla Bol [Evening Debate Edition] 6:30PM — high-voltage prime time political debate show."
      },
       127: {
        category: "late night",
        network: "AajTak",
        show: "Das Tak",
        edition: "Late Night Wrap",
        disambiguator: "10 PM day-end top 10 stories",
        tags: ["das tak", "10pm", "night news", "late night", "wrap up", "day end", "summary"],
        description: "AajTak Das Tak 10PM Edition — concise late night news wrap of the day's top 10 stories."
      },
       128: {
        category: "debate",
        network: "AajTak",
        show: "Halla Bol",
        edition: "Evening Edition",
        disambiguator: "6 PM slightly earlier shorter format debate",
        tags: ["halla bol", "debate", "6pm", "panel", "anchor", "evening news", "discussion", "early evening"],
        description: "AajTak Halla Bol [Evening Edition] 6PM — earlier evening debate format show."
      },
       129: {
        category: "elections",
        network: "AajTak",
        show: "Delhi Exit Poll",
        edition: "2020 Results",
        disambiguator: "Delhi election exit poll 2020 predictions voting chunav",
        tags: ["election", "exit poll", "delhi", "2020", "voting", "results", "chunav", "predictions"],
        description: "AajTak Delhi Exit Poll 2020 — election day exit poll coverage and predictions for Delhi."
      },
       130: {
        category: "investigation",
        network: "AajTak",
        show: "Special Report",
        edition: "2019 Archive",
        disambiguator: "2019 archived investigation documentary long form",
        tags: ["special report", "2019", "investigation", "documentary", "in depth", "long form"],
        description: "AajTak 2019 Special Report Edition — investigative journalism from 2019."
      },
       131: {
        category: "panel show",
        network: "AajTak",
        show: "Ek aur Ek Gyarah",
        edition: "Classic 2017",
        disambiguator: "2017 panel discussion talk show older archive",
        tags: ["ek aur ek gyarah", "2017", "panel", "discussion", "talk show", "older", "archive"],
        description: "AajTak 2017 Ek aur Ek Gyarah Edition — classic panel discussion programme."
      },
       132: {
        category: "debate",
        network: "AajTak",
        show: "Halla Bol",
        edition: "Late Edition 2019",
        disambiguator: "2019 archived late edition debate Anjana Om Kashyap",
        tags: ["halla bol", "2019", "debate", "archive", "panel", "anchor", "Anjana Om Kashyap", "late edition"],
        description: "AajTak 2019 Halla Bol [Late Edition] — archived 2019 prime time debate."
      },
       133: {
        category: "Investigation",
        network: "AajTak",
        show: "Khabardar",
        edition: "9PM Binge",
        disambiguator: "9PM Sweta Singh investigation binge watch",
        tags: ["Khabardar", "2019", "Sweta Singh", "9PM", "21:00", "past"],
        description: "Khabardar - Best for 9PM Binge Watching"
      },
        134: {
        category: "news debate",
        network: "AajTak",
        show: "Dangal",
        edition: "Prime Time",
        disambiguator: "aajtak dangal debate prime time news analysis",
        tags: ["aajtak", "dangal", "debate", "prime time", "news", "analysis", "feature"],
        description: "AajTak Dangal — a prime-time news debate show with in-depth analysis."
      },
        135: {
        category: "news analysis",
        network: "AajTak",
        show: "Desh Tak",
        edition: "National News",
        disambiguator: "aajtak desh tak national news analysis current affairs",
        tags: ["aajtak", "desh tak", "national news", "analysis", "current affairs", "feature"],
        description: "AajTak Desh Tak — national news analysis and current affairs show."
      },
        136: {
        category: "news bulletin",
        network: "India Today",
        show: "Mid Morning Bulletin",
        edition: "11 AM",
        disambiguator: "india today mid morning bulletin 11am news update",
        tags: ["india today", "mid morning", "bulletin", "11am", "news", "morning"],
        description: "India Today Mid Morning Bulletin (11 AM) — your morning news update at 11."
      },
        137: {
        category: "live news",
        network: "AajTak",
        show: "Live Stream",
        edition: "24x7",
        disambiguator: "live breaking news round the clock current",
        tags: ["live", "aajtak live", "24x7", "streaming", "breaking", "hls"],
        description: "AajTak Live — round-the-clock live news streaming. Best for breaking news right now."
      },
        138: {
        category: "live news",
        network: "India Today",
        show: "Live Stream",
        edition: "24x7",
        disambiguator: "india today live news stream 24x7 breaking",
        tags: ["live", "india today live", "24x7", "streaming", "breaking news", "hls"],
        description: "India Today Live — 24x7 live news streaming from India Today. Best for breaking news."
      },
        139: {
        category: "live news",
        network: "NDTV",
        show: "India Live",
        edition: "24x7 Stream",
        disambiguator: "hindi live news stream 24x7 ndtv india",
        tags: ["live", "live tv", "24x7", "streaming", "breaking news", "now", "real time", "current", "hls", "ndtv india"],
        description: "NDTV India [24x7 Live Stream] — 24x7 live Hindi news stream."
      },
        140: {
        category: "live news",
        network: "NDTV",
        show: "24x7 Live",
        edition: "English News",
        disambiguator: "ndtv 24x7 english live news stream",
        tags: ["live", "ndtv 24x7", "24x7", "streaming", "breaking news", "english", "hls", "ndtv"],
        description: "NDTV 24x7 [24x7 Live Stream] — round-the-clock English news from NDTV."
      },
        221: {
        category: "kids",
        network: "Nick Jr.",
        show: "Paw Patrol",
        edition: "Mission 1",
        disambiguator: "paw patrol episode 1 rescue mission kids cartoon children",
        tags: ["paw patrol", "nick jr", "kids", "cartoon", "children", "rescue", "mission", "animated", "toddler"],
        description: "Nick Jr. Paw Patrol Mission 1 — the PAW Patrol team goes on a rescue mission. Best for kids and toddlers."
      },
       222: {
        category: "kids",
        network: "Nick Jr.",
        show: "Paw Patrol",
        edition: "Mission 2",
        disambiguator: "paw patrol episode 2 second mission kids cartoon",
        tags: ["paw patrol", "nick jr", "kids", "cartoon", "children", "rescue", "mission 2", "animated", "toddler"],
        description: "Nick Jr. Paw Patrol Mission 2 — another exciting rescue adventure with the PAW Patrol pups."
      },
       223: {
        category: "kids",
        network: "Nick Jr.",
        show: "Peppa Pig",
        edition: "Samundar Yatra",
        disambiguator: "peppa pig ocean sea journey samundar yatra kids cartoon",
        tags: ["peppa pig", "nick jr", "kids", "cartoon", "children", "samundar", "ocean", "sea", "animated", "toddler", "hindi"],
        description: "Nick Jr. Peppa Pig Samundar Yatra — Peppa and her family go on an ocean adventure."
      },
       224: {
        category: "kids",
        network: "Nick Jr.",
        show: "Peppa Pig",
        edition: "Shopping Spree",
        disambiguator: "peppa pig shopping mall store kids cartoon fun",
        tags: ["peppa pig", "nick jr", "kids", "cartoon", "children", "shopping", "mall", "store", "animated", "toddler", "hindi"],
        description: "Nick Jr. Peppa Pig Shopping Spree — Peppa goes on a fun shopping trip with her family."
      },
       225: {
        category: "kids",
        network: "Nick",
        show: "Chikoo Aur Bunty",
        edition: "Adventure 1",
        disambiguator: "chikoo aur bunty episode 1 kids cartoon comedy",
        tags: ["chikoo aur bunty", "nick", "kids", "cartoon", "children", "comedy", "animated", "hindi"],
        description: "Nick Chikoo Aur Bunty Adventure 1 — the hilarious duo Chikoo and Bunty go on a fun adventure."
      },
       226: {
        category: "kids",
        network: "Nick",
        show: "Chikoo Aur Bunty",
        edition: "Adventure 2",
        disambiguator: "chikoo aur bunty episode 2 kids cartoon comedy",
        tags: ["chikoo aur bunty", "nick", "kids", "cartoon", "children", "comedy", "animated", "hindi"],
        description: "Nick Chikoo Aur Bunty Adventure 2 — another comedy adventure with Chikoo and Bunty."
      },
       227: {
        category: "kids",
        network: "Nick",
        show: "Motu Patlu",
        edition: "Episode 1",
        disambiguator: "motu patlu episode 1 kids cartoon comedy",
        tags: ["motu patlu", "nick", "kids", "cartoon", "children", "comedy", "animated", "hindi", "motu", "patlu"],
        description: "Nick Motu Patlu Episode 1 — the famous duo Motu and Patlu's first hilarious adventure."
      },
       228: {
        category: "kids",
        network: "Nick",
        show: "Motu Patlu",
        edition: "Episode 2",
        disambiguator: "motu patlu episode 2 kids cartoon comedy",
        tags: ["motu patlu", "nick", "kids", "cartoon", "children", "comedy", "animated", "hindi", "motu", "patlu"],
        description: "Nick Motu Patlu Episode 2 — another round of laughs with Motu Patlu."
      },
    };
    window.AI_CHANNEL_META = META;

    // ── 2. Build retrieval corpus from dishChannels + META ──────────
    function buildCorpus() {
      if (typeof dishChannels === 'undefined' || !Array.isArray(dishChannels)) return [];
      return dishChannels.map((ch, i) => {
        const m = (ch.name.match(/(\d+)/) || [])[1];
        const num = m ? parseInt(m, 10) : null;
        const meta = META[num] || { category: "", tags: [], description: "" };
        return {
          index: i,
          number: num,
          name: ch.name,
          src: ch.src,
          text: [ch.name, meta.category, meta.tags.join(" "), meta.description, meta.show || "", meta.edition || "", meta.disambiguator || ""].join(" "),
          meta,
        };
      });
    }

    const STOPWORDS = new Set("a an the of in on at for to and or with is are be i want watch show me play put on something some please give like mujhe dikhao chahiye dikha do".split(" "));
    const tokenize = (s) =>
      (s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, " ")
        .split(/\s+/).filter(w => w && !STOPWORDS.has(w));

    function buildIndex(corpus) {
      const docs = corpus.map(d => tokenize(d.text));
      const df = new Map();
      docs.forEach(toks => new Set(toks).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
      const N = docs.length;
      const idf = new Map();
      df.forEach((v, k) => idf.set(k, Math.log(1 + N / v)));
      const vectors = docs.map(toks => {
        const tf = new Map();
        toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
        const vec = new Map();
        tf.forEach((c, t) => vec.set(t, (c / toks.length) * (idf.get(t) || 0)));
        return vec;
      });
      return { idf, vectors, corpus };
    }

    function queryVec(q, idf) {
      const toks = tokenize(q);
      const tf = new Map();
      toks.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
      const vec = new Map();
      tf.forEach((c, t) => vec.set(t, (c / Math.max(1, toks.length)) * (idf.get(t) || 0)));
      return vec;
    }

    function cosine(a, b) {
      let dot = 0, na = 0, nb = 0;
      a.forEach((v, k) => { na += v * v; if (b.has(k)) dot += v * b.get(k); });
      b.forEach(v => { nb += v * v; });
      if (!na || !nb) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    function retrieve(q, idx, k = 5) {
      const qv = queryVec(q, idx.idf);
      const scored = idx.corpus.map((d, i) => ({ doc: d, score: cosine(qv, idx.vectors[i]) }));
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, k);
    }

    // ── 3. Generation — Gemini picks ONE candidate ──────────────────
    //  Strategy:
    //    1. Try server proxy at /api/ai-pick  → uses the OWNER's key,
    //       set as GEMINI_API_KEY in Vercel env vars. No client key needed.
    //    2. If the proxy isn't deployed (404) or fails, fall back to the
    //       user's own pasted key (legacy / local dev mode).
    //    3. If neither works → retrieval-only mode handled by ask().
            async function serverPick(query, candidates) {
      const userKeys = {};
      const gk = localStorage.getItem(AI_GEMINI_KEY_STORE);
      const grk = localStorage.getItem(AI_GROQ_KEY_STORE);
      const ork = localStorage.getItem(AI_OPENROUTER_KEY_STORE);
      if (gk)  userKeys.gemini = gk;
      if (grk) userKeys.groq = grk;
      if (ork) userKeys.openrouter = ork;

      // Mode resolution: respect explicit user choice, else build from toggles
      let mode = localStorage.getItem(AI_MODE_STORE) || 'auto';
      if (mode === 'auto') {
        const gOn  = localStorage.getItem(AI_GEMINI_ON_STORE)     !== 'false';
        const grOn = localStorage.getItem(AI_GROQ_ON_STORE)       !== 'false';
        const orOn = localStorage.getItem(AI_OPENROUTER_ON_STORE) !== 'false';
        const enabled = [grOn && 'groq', gOn && 'gemini', orOn && 'openrouter'].filter(Boolean);
        if (enabled.length === 0)      throw new Error('All AI providers are toggled off');
        else if (enabled.length === 1) mode = enabled[0];
        else if (enabled.length === 3) mode = 'all';
        else if (enabled.includes('groq') && enabled.includes('gemini')) mode = 'race';
        else                            mode = enabled[0];
      }

      const res = await fetch('/api/ai-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          mode,
          user_keys: Object.keys(userKeys).length ? userKeys : undefined,
          candidates: candidates.map(c => ({
            number: c.doc.number,
            name: c.doc.name,
            category: c.doc.meta.category,
            show: c.doc.meta.show || '',
            edition: c.doc.meta.edition || '',
            disambiguator: c.doc.meta.disambiguator || '',
            tags: c.doc.meta.tags,
            description: c.doc.meta.description,
          })),
        }),
      });
      if (res.status === 404) throw new Error('NO_PROXY');
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Proxy ${res.status}: ${t.slice(0, 160)}`);
      }
      return res.json();
    }

    async function geminiPick(query, candidates, apiKey) {
      const ctx = candidates.map((c, i) =>
        `[${i + 1}] number=${c.doc.number} | "${c.doc.name}" (${c.doc.meta.category})\n` +
        `    show: ${c.doc.meta.show || '—'} | edition: ${c.doc.meta.edition || '—'}\n` +
        `    hint: ${c.doc.meta.disambiguator || '—'}\n` +
        `    tags: ${(c.doc.meta.tags || []).join(", ")}\n` +
        `    about: ${c.doc.meta.description}`
      ).join("\n");

      const prompt =
`You are the AI inside a Samsung C5000 LCD TV connected via HDMI 3 to a DishTV set-top box. The user just said:
"${query}"

Below are the top channels retrieved from the DishTV channel guide. Pay close attention to each channel's show name, edition, and hint to disambiguate between similar-sounding channels. Pick the SINGLE best match.

Channels:
${ctx}

Reply with STRICT JSON ONLY, no markdown:
{"channel_number": <number>, "reason": "<one short sentence, in the user's language>"}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      try { return { ...JSON.parse(txt), via: 'client' }; }
      catch { return { channel_number: candidates[0].doc.number, reason: "Fallback to top retrieved channel.", via: 'client' }; }
    }

    // Safe wrapper — never crashes even if host helpers aren't loaded
    function toast(msg, icon, type) {
      if (typeof showToast === 'function') {
        try { return showToast(msg, icon || '', type || 'info'); } catch {}
      }
      console.log(`[AI] ${msg}`);
    }

    // ── 4. Tune the TV using the host's existing helpers ────────────
    function tuneTo(targetNumber, reason) {
      if (typeof dishChannels === 'undefined' || !Array.isArray(dishChannels)) {
        toast('TV channel guide not loaded yet — please wait a moment and try again.', '⚠️', 'error');
        return false;
      }
      const idx = dishChannels.findIndex(c => {
        const m = c.name.match(/(\d+)/);
        return m && parseInt(m[1], 10) === targetNumber;
      });
      if (idx < 0) {
        toast(`AI picked CH ${targetNumber} but it's not in the guide`, '⚠️', 'error');
        return false;
      }

      // Make sure we're on HDMI 3 (DishTV). If not, ask the user before switching.
      if (typeof activeInputSource !== 'undefined' && activeInputSource !== 4) {
        toast('Switch to HDMI 3 (DishTV) first, then ask again.', '📡', 'info');
        return false;
      }

      // Power on the dish receiver if it's off
      if (typeof dishPower !== 'undefined' && !dishPower) {
        toast('DishTV receiver is off. Press its power button first.', '⏻', 'info');
        return false;
      }

      if (typeof dishChannel !== 'undefined') dishChannel = idx;
      if (typeof dishVideoTime !== 'undefined') dishVideoTime = 0;
      const video = document.getElementById('dishVideo');
      if (video && typeof loadDishVideo === 'function') {
        loadDishVideo(video, dishChannels[idx].src, 0);
      }
      if (typeof updateAudioVolumes === 'function') updateAudioVolumes();
      const infoEl = document.getElementById('dishChannelInfo');
      if (infoEl) infoEl.innerText = dishChannels[idx].name;
      if (typeof saveSettings === 'function') saveSettings();

      toast(`🤖 ${dishChannels[idx].name} — ${reason}`, '🤖', 'success');
      return true;
    }

    // ── 5. State, persistence, and full pipeline ────────────────────
    const AI_GEMINI_MODEL         = 'gemini-3.1-flash-lite';
    const AI_GEMINI_KEY_STORE     = 'samsung_tv_ai_gemini_key_v1';
    const AI_GROQ_KEY_STORE       = 'samsung_tv_ai_groq_key_v1';
    const AI_OPENROUTER_KEY_STORE = 'samsung_tv_ai_openrouter_key_v1';
    const AI_GEMINI_ON_STORE      = 'samsung_tv_ai_gemini_on_v1';
    const AI_GROQ_ON_STORE        = 'samsung_tv_ai_groq_on_v1';
    const AI_OPENROUTER_ON_STORE  = 'samsung_tv_ai_openrouter_on_v1';
    const AI_MODE_STORE           = 'samsung_tv_ai_mode_v1';
    const AI_ENABLED_STORE  = 'samsung_tv_ai_enabled_v1';
    const KB_LOCK_STORE     = 'samsung_tv_kb_lock_v1';  // master TV-shortcut lock
    const AI_TUNE_SHORTCUTS_STORE = 'samsung_tv_ai_tune_shortcuts_v1';
    const AI_PICKER_HISTORY_STORE = 'samsung_tv_ai_picker_history_v1';

    let INDEX = buildIndex(buildCorpus());
    let aiEnabled    = localStorage.getItem(AI_ENABLED_STORE) !== 'false';
    let kbLocked     = localStorage.getItem(KB_LOCK_STORE)    === 'true';
    let tuneShortcutsEnabled = localStorage.getItem(AI_TUNE_SHORTCUTS_STORE) !== 'false';
    let lastAIResponse = null;
    let aiPickerHistory = JSON.parse(localStorage.getItem(AI_PICKER_HISTORY_STORE) || '[]');
    const MAX_AI_HISTORY = 10;

    // ── Keyboard guard ──────────────────────────────────────────────────
    //  The host script's keydown handlers fire on EVERY keypress, even when
    //  the user is typing into an <input> — so typing "Special" toggles
    //  the Source menu (S), typing "Power" toggles power (P), "0" mutes, etc.
    //
    //  We install a single high-priority capturing listener that stops
    //  propagation when EITHER:
    //    (a) the event target is an editable field      ← always-on bug fix
    //    (b) the user has flipped the global KB lock    ← user-requested toggle
    //
    //  Using `capture: true` guarantees we run BEFORE the host's bubble-phase
    //  listeners, so we can call stopPropagation() to silence them.
    function isEditable(el) {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }
    // TV shortcut keys that should be blocked when kbLocked, target editable,
    // or modal is open — prevents P (power), S (source), M (menu), digits,
    // arrows, +/- from reaching the Samsung_TV.html handlers.
    const TV_SHORTCUT_KEYS = new Set([
      'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace','F1',
      'm','M','s','S','p','P',
      '0','1','2','3','4','5','6','7','8','9',
      '+','=','-','_',
    ]);
    function keyboardGuard(e) {
      // Always let modifier-laden shortcuts through (Ctrl-R, Cmd-V, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const modalEl = document.getElementById('ai-modal-backdrop');
      const modalOpen = modalEl && modalEl.classList.contains('open');
      if (kbLocked || isEditable(e.target) || modalOpen) {
        if (TV_SHORTCUT_KEYS.has(e.key)) {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
    }
    // Capture phase = runs before bubble-phase listeners on window/document.
    window.addEventListener('keydown', keyboardGuard, true);
    window.addEventListener('keyup',   keyboardGuard, true);
    window.addEventListener('keypress',keyboardGuard, true);

    async function ask(query) {
      if (!aiEnabled) {
        toast('AI Channel Picker is OFF (toggle it on in the modal)', '🤖', 'info');
        return;
      }
      if (!query || !query.trim()) return;

      // Re-build the index in case dishChannels grew via broadcast update
      INDEX = buildIndex(buildCorpus());

      const candidates = retrieve(query, INDEX, 5);
      if (!candidates.length || (candidates[0].score === 0 && !localStorage.getItem(AI_GEMINI_KEY_STORE))) {
        toast("No matching channels found.", "🔎", "info");
        return;
      }

      const userKey = localStorage.getItem(AI_GEMINI_KEY_STORE) || '';
      let pickNum, reason, via = 'retrieval';
      let pickResponse = null;

      // ── Strategy 1: server proxy (no key needed; preferred path) ──
      let serverModel = null;
      let serverSource = null;
      let serverLatency = null;
      try {
        toast('🤖 Asking AI…', '🤖', 'info');
        const pick = await serverPick(query, candidates);
        pickNum     = pick.channel_number;
        reason      = pick.reason || 'Best match for your request.';
        serverModel = pick.model || null;
        serverSource = pick.source || null;
        serverLatency = pick.latency_ms || null;
        via         = 'server';
        pickResponse = pick;
      } catch (serverErr) {
        // ── Strategy 2: user's pasted key (local dev / no proxy) ──
        if (userKey) {
          try {
            const pick = await geminiPick(query, candidates, userKey);
            pickNum = pick.channel_number;
            reason  = pick.reason || 'Best match for your request.';
            via     = 'client';
          } catch (clientErr) {
            toast('AI error: ' + clientErr.message, '⚠️', 'error');
            pickNum = candidates[0].doc.number;
            reason  = `Fallback (retrieval-only) · score ${candidates[0].score.toFixed(3)}`;
          }
        } else if (serverErr.message === 'NO_PROXY') {
          // ── Strategy 3: retrieval-only ──
          pickNum = candidates[0].doc.number;
          reason  = `Retrieval-only (no server, no key) · TF-IDF ${candidates[0].score.toFixed(3)}`;
        } else {
          toast('Server AI error: ' + serverErr.message, '⚠️', 'error');
          pickNum = candidates[0].doc.number;
          reason  = `Fallback (retrieval-only) · score ${candidates[0].score.toFixed(3)}`;
        }
      }

      // Low-confidence hint
      if (candidates.length && candidates[0].score < 0.15) {
        toast(
          'No exact match for "' + query + '". Closest: ' + (candidates[0].doc.name || 'Ch ' + pickNum) + '. Try a different query?',
          '\u{1F914}',
          'info'
        );
      }

      tuneTo(pickNum, reason);

      // Store for "Why this channel?" panel
      lastAIResponse = {
        query: query,
        candidates: candidates,
        pick: pickResponse || { channel_number: pickNum, reason: reason, source: via, model: serverModel },
        timestamp: Date.now()
      };

      recordAIPick(query, pickNum, reason, via, serverModel, serverLatency);

      // Render provider badge if server gave us data
      if (pickResponse && pickResponse.source) {
        renderProviderBadge(pickResponse);
      }

      logToConsole(query, candidates, pickNum, reason, via, serverModel);
    }

    function logToConsole(q, cands, pickNum, reason, via, model) {
      try {
        const tag = via === 'server' ? `🛡 server proxy${model ? ' · ' + model : ''}`
                  : via === 'client' ? '🔑 client key'
                  : '🔎 retrieval-only';
        console.groupCollapsed(`%c[AI Channel Picker] (${tag}) "${q}" → CH ${pickNum}`, 'color:#06b6d4;font-weight:bold;');
        console.log('Reason:', reason);
        console.table(cands.map(c => ({ ch: c.doc.number, name: c.doc.name, score: +c.score.toFixed(4) })));
        console.groupEnd();
      } catch {}
    }

    function recordAIPick(query, channelNum, reason, via, model, latencyMs) {
      const entry = {
        query: query,
        channel: channelNum,
        reason: reason,
        via: via,
        model: model || null,
        latency: latencyMs || null,
        timestamp: Date.now()
      };
      aiPickerHistory.unshift(entry);
      if (aiPickerHistory.length > MAX_AI_HISTORY) aiPickerHistory.length = MAX_AI_HISTORY;
      localStorage.setItem(AI_PICKER_HISTORY_STORE, JSON.stringify(aiPickerHistory));
    }

    function renderStatsPanel() {
      var panel = document.getElementById('ai-stats-panel');
      var toggle = document.getElementById('ai-stats-toggle');
      if (!panel || !toggle) return;
      if (panel.style.display !== 'none') {
        panel.style.display = 'none';
        toggle.textContent = '\uD83D\uDCCA AI Pick Stats \u25BE';
        return;
      }
      if (!aiPickerHistory.length) {
        panel.innerHTML = '<div style="padding:8px;color:#94a3b8;text-align:center;">No picks recorded yet.</div>';
      } else {
        var html = '<div style="padding:4px 0;">';
        aiPickerHistory.forEach(function(e, i) {
          var date = new Date(e.timestamp);
          var timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          var src = e.via === 'server' ? (e.model || 'AI') : e.via;
          var lat = e.latency ? (e.latency + 'ms') : '—';
          html += '<div style="display:grid;grid-template-columns:20px 1fr 60px 50px 50px;gap:4px;padding:3px 6px;border-bottom:1px solid rgba(255,255,255,0.05);align-items:center;">';
          html += '<span style="color:#64748b;">' + (i + 1) + '.</span>';
          html += '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0;">Ch ' + e.channel + '</span>';
          html += '<span style="color:#06b6d4;font-size:9px;">' + src + '</span>';
          html += '<span style="color:#94a3b8;text-align:right;">' + lat + '</span>';
          html += '<span style="color:#64748b;text-align:right;font-size:9px;">' + timeStr + '</span>';
          html += '</div>';
        });
        html += '</div>';
        html += '<button id="ai-stats-clear" style="margin-top:4px;background:#450a0a;color:#fca5a5;border:none;border-radius:4px;padding:3px 10px;font-size:9px;cursor:pointer;">Clear History</button>';
        panel.innerHTML = html;
        var clearBtn = document.getElementById('ai-stats-clear');
        if (clearBtn) clearBtn.addEventListener('click', function() {
          aiPickerHistory = [];
          localStorage.removeItem(AI_PICKER_HISTORY_STORE);
          renderStatsPanel();
        });
      }
      panel.style.display = 'block';
      toggle.textContent = '\uD83D\uDCCA AI Pick Stats \u25B2';
    }

    function renderProviderBadge(response) {
      const { source, model, latency_ms } = response;
      const colorClass = {
        'groq': 'text-emerald-400',
        'gemini': 'text-sky-400',
        'openrouter': 'text-purple-400',
        'both': 'text-amber-400',
        'retrieval': 'text-zinc-400'
      }[source] || 'text-zinc-400';
      const icon = {
        'groq': '⚡',
        'gemini': '🤖',
        'openrouter': '🆓',
        'both': '⚡🤖',
        'retrieval': '🔎'
      }[source] || '?';
      const shortModel = (model || '').split('/').pop().split('-').slice(0, 2).join('-');
      const badge = document.createElement('div');
      badge.className = 'provider-badge font-mono text-[10px] ' + colorClass;
      badge.style.cssText = 'position: absolute; bottom: 8px; right: 12px; padding: 4px 8px; background: rgba(0,0,0,0.6); border-radius: 4px; backdrop-filter: blur(4px);';
      badge.textContent = icon + ' ' + source + ' · ' + shortModel + ' · ' + latency_ms + 'ms';
      resultContainer = document.querySelector('#ai-modal');
      if (!resultContainer) resultContainer = document.body;
      resultContainer.appendChild(badge);
      setTimeout(() => {
        badge.style.transition = 'opacity 0.5s';
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 500);
      }, 5000);
    }

    function renderWhyPanel() {
      if (!lastAIResponse) return;
      const { query, candidates, pick } = lastAIResponse;
      let panel = document.getElementById('ai-why-panel');
      if (panel) {
        panel.remove();
        const toggle = document.getElementById('ai-why-toggle');
        if (toggle) toggle.textContent = 'Why this channel? ▾';
        return;
      }
      panel = document.createElement('div');
      panel.id = 'ai-why-panel';
      panel.className = 'why-panel';
      panel.style.cssText = 'padding: 12px; background: rgba(0,0,0,0.8); border-radius: 8px; margin-top: 8px; font-size: 11px; color: #e2e8f0;';
      panel.innerHTML =
        '<div style="font-weight: bold; color: #7dd3fc; margin-bottom: 8px;">Why Channel ' + pick.channel_number + '?</div>' +
        '<div style="margin-bottom: 8px;">' +
          '<strong>Top candidates from TF-IDF retrieval:</strong>' +
          '<table style="width: 100%; margin-top: 4px; font-family: monospace; font-size: 10px;">' +
          candidates.slice(0, 5).map(function(c, i) {
            var scoreDisplay = c.score.toFixed(3);
            var star = c.doc.number === pick.channel_number ? ' ★' : '';
            var color = c.doc.number === pick.channel_number ? '#10b981' : '#64748b';
            return '<tr><td>' + (i + 1) + '.</td><td>Ch ' + c.doc.number + '</td><td>' + (c.doc.name || '').substring(0, 30) + '</td><td style="text-align: right; color: ' + color + ';">' + scoreDisplay + star + '</td></tr>';
          }).join('') +
          '</table>' +
        '</div>' +
        '<div><strong>' + (pick.source || 'AI') + '\'s reasoning:</strong><div style="font-style: italic; margin-top: 4px;">"' + (pick.reason || '') + '"</div></div>';
      var target = document.querySelector('#ai-modal');
      if (target) target.appendChild(panel);
      var toggle = document.getElementById('ai-why-toggle');
      if (toggle) toggle.textContent = 'Hide ▴';
    }

    // ── 6. UI: floating button + prompt modal ───────────────────────
    function injectUI() {
      const style = document.createElement('style');
      style.textContent = `
        #ai-fab {
          position: fixed; right: 18px; bottom: 18px; z-index: 999999;
          min-width: 64px; height: 64px; padding: 0 14px 0 12px; border-radius: 999px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          color: #fff; border: 1px solid rgba(255,255,255,.18);
          box-shadow: 0 12px 28px rgba(2,132,199,.55), inset 0 1px 1px rgba(255,255,255,.25);
          cursor: pointer; transition: transform .15s, opacity .2s, box-shadow .2s;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #ai-fab:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 16px 36px rgba(2,132,199,.7); }
        #ai-fab.off { background: linear-gradient(135deg, #475569, #334155); opacity: .85; }
        #ai-fab.kblocked { box-shadow: 0 12px 28px rgba(2,132,199,.55), inset 0 1px 1px rgba(255,255,255,.25), 0 0 0 3px rgba(234,179,8,.6); }
        #ai-fab .ai-fab-label { font-size: 13px; font-weight: 800; letter-spacing: .5px; }
        #ai-fab svg { display: block; }
        #ai-fab .dot { position:absolute; top:6px; right:6px; width:10px; height:10px; border-radius:50%;
                       background:#22c55e; box-shadow:0 0 8px #22c55e; border: 1.5px solid #0c2030; }
        #ai-fab.off .dot { background:#9ca3af; box-shadow:none; }
        @media (max-width: 600px) {
          #ai-fab { min-width: 56px; height: 56px; padding: 0 12px; }
          #ai-fab .ai-fab-label { display: none; }
        }

        #ai-modal-backdrop {
          position: fixed; inset: 0; background: rgba(2,6,23,.7); backdrop-filter: blur(6px);
          z-index: 10000; display: none; align-items: center; justify-content: center;
        }
        #ai-modal-backdrop.open { display: flex; }
        #ai-modal {
          position: relative;
          width: 1280px; max-width: 92vw; height: 720px; max-height: 90vh;
          overflow-y: auto;
          background: linear-gradient(145deg, rgba(11,27,58,.96), rgba(5,12,31,.98));
          border: 1px solid rgba(56,189,248,.35);
          border-radius: 14px; padding: 18px; color: #e6ecf3;
          box-shadow: 0 30px 80px rgba(0,0,0,.6), inset 0 1px 1px rgba(255,255,255,.15);
          font-family: 'Inter', sans-serif;
        }
        #ai-modal h3 { margin: 0 0 4px; font-size: 16px; color: #7dd3fc; letter-spacing: .5px; }
        #ai-modal .sub { color: #94a3b8; font-size: 12px; margin-bottom: 14px; }
        #ai-modal label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .8px; }
        #ai-modal input[type="text"], #ai-modal input[type="password"] {
          width: 100%; box-sizing: border-box;
          background: rgba(15,23,42,.7); border: 1px solid rgba(56,189,248,.25);
          color: #e6ecf3; padding: 10px 12px; border-radius: 8px; font-size: 13px;
          margin: 4px 0 12px; font-family: inherit;
        }
        #ai-modal input:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.18); }
        #ai-modal .row { display: flex; gap: 8px; align-items: center; }
        #ai-modal .row > input { margin-bottom: 0; }
        #ai-modal .btn {
          background: linear-gradient(135deg,#0ea5e9,#6366f1); color: #fff; border: none;
          padding: 9px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;
        }
        #ai-modal .btn.ghost { background: rgba(148,163,184,.15); color:#cbd5e1; border:1px solid rgba(148,163,184,.25); }
        #ai-modal .actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; }
        #ai-modal .chips { display:flex; flex-wrap:wrap; gap:6px; margin: 4px 0 12px; }
        #ai-modal .chip {
          background: rgba(56,189,248,.10); border: 1px solid rgba(56,189,248,.25);
          color: #bae6fd; padding: 4px 8px; border-radius: 999px; font-size: 11px; cursor: pointer;
        }
        #ai-modal .chip:hover { background: rgba(56,189,248,.22); }
        #ai-modal .toggle-row { display:flex; align-items:center; justify-content:space-between;
          background: rgba(15,23,42,.6); padding: 8px 12px; border-radius: 8px;
          border: 1px solid rgba(148,163,184,.18); margin-bottom: 12px; font-size: 12px;
        }
        .ai-switch { position:relative; width:38px; height:20px; }
        .ai-switch input { opacity:0; width:0; height:0; }
        .ai-switch .slider { position:absolute; inset:0; background:#334155; border-radius:20px; cursor:pointer; transition:.2s; }
        .ai-switch .slider::before { content:""; position:absolute; left:3px; top:3px; width:14px; height:14px;
                                     border-radius:50%; background:#fff; transition:.2s; }
        .ai-switch input:checked + .slider { background:#0ea5e9; }
        .ai-switch input:checked + .slider::before { transform: translateX(18px); }
        #ai-modal .hint { font-size:11px; color:#64748b; margin-top:-6px; margin-bottom:10px; }
        #ai-modal .hint a { color:#7dd3fc; }
      `;
      document.head.appendChild(style);

      const fab = document.createElement('button');
      fab.id = 'ai-fab';
      fab.title = 'AI Channel Picker (RAG) — press I';
      // Inline SVG + label so it works even if Font Awesome CDN is blocked
      fab.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2"/>
          <path d="M8 3l4 4 4-4"/>
          <circle cx="9" cy="13" r="1.2" fill="currentColor"/>
          <circle cx="15" cy="13" r="1.2" fill="currentColor"/>
          <path d="M9 17h6"/>
        </svg>
        <span class="ai-fab-label">AI</span>
        <span class="dot"></span>`;
      fab.classList.toggle('off', !aiEnabled);
      fab.classList.toggle('kblocked', kbLocked);
      document.body.appendChild(fab);

      const modal = document.createElement('div');
      modal.id = 'ai-modal-backdrop';
      modal.innerHTML = `
        <div id="ai-modal" role="dialog" aria-modal="true">
          <h3>🤖 AI Channel Picker — RAG</h3>
          <div class="sub">Tells DishTV (HDMI 3) what to tune. Retrieval (TF-IDF) → Gemini → tune.</div>

          <div class="toggle-row">
            <span>⏻ &nbsp; AI assistant</span>
            <label class="ai-switch">
              <input type="checkbox" id="ai-toggle-modal" ${aiEnabled ? 'checked' : ''}/>
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row" title="Stops keys like P, S, M, 0–9, +/-, arrows from triggering TV shortcuts.">
            <span>⌨️ &nbsp; Lock TV keyboard shortcuts (typing-only mode)</span>
            <label class="ai-switch">
              <input type="checkbox" id="ai-kblock-modal" ${kbLocked ? 'checked' : ''}/>
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row" title="Enable Ctrl+Enter and Enter to tune the selected channel.">
            <span>🎯 &nbsp; AI Tune Channel Shortcuts (Ctrl+Enter / Enter)</span>
            <label class="ai-switch">
              <input type="checkbox" id="ai-tune-shortcuts-modal" ${tuneShortcutsEnabled ? 'checked' : ''}/>
              <span class="slider"></span>
            </label>
          </div>

          <div class="provider-section" style="border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:10px; margin:6px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="color:#fbbf24;">🤖 Gemini 3.1 Flash Lite</strong>
              <label class="ai-switch">
                <input type="checkbox" id="ai-toggle-gemini" />
                <span class="slider"></span>
              </label>
            </div>
            <input id="ai-key-gemini" type="password" placeholder="AQ… (optional — server key used if blank)" autocomplete="off" style="width:100%;" />
            <div class="hint" style="font-size:11px;">Deep reasoning, slower (~3s). Free: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:#7dd3fc;">aistudio.google.com/apikey</a></div>
          </div>

          <div class="provider-section" style="border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:10px; margin:6px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="color:#22d3ee;">⚡ Groq Llama 3.3 70B</strong>
              <label class="ai-switch">
                <input type="checkbox" id="ai-toggle-groq" />
                <span class="slider"></span>
              </label>
            </div>
            <input id="ai-key-groq" type="password" placeholder="gsk_… (optional — server key used if blank)" autocomplete="off" style="width:100%;" />
            <div class="hint" style="font-size:11px;">Fast (~500ms). Free: <a href="https://console.groq.com/keys" target="_blank" rel="noopener" style="color:#7dd3fc;">console.groq.com/keys</a></div>
          </div>

          <div class="provider-section" style="border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:10px; margin:6px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="color:#a78bfa;">🆓 OpenRouter (Free Tier)</strong>
              <label class="ai-switch">
                <input type="checkbox" id="ai-toggle-openrouter" />
                <span class="slider"></span>
              </label>
            </div>
            <input id="ai-key-openrouter" type="password" placeholder="sk-or-v1-… (optional — server key used if blank)" autocomplete="off" style="width:100%;" />
            <div class="hint" style="font-size:11px;">Free Llama 3.2 3B Instruct. Get key: <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" style="color:#7dd3fc;">openrouter.ai/keys</a></div>
          </div>

          <label style="margin-top:8px;">Mode</label>
          <select id="ai-mode-select" style="width:100%;padding:6px;border-radius:6px;background:#0f172a;color:#e2e8f0;border:1px solid rgba(255,255,255,.12);">
            <option value="auto">Auto (smart default)</option>
            <option value="groq">Groq only</option>
            <option value="gemini">Gemini only</option>
            <option value="openrouter">OpenRouter only</option>
            <option value="race">Race (Groq + Gemini, first wins)</option>
            <option value="all">All Three (first wins, most resilient)</option>
            <option value="both">Both (Groq + Gemini, deeper reason)</option>
          </select>
          <div class="hint" style="font-size:11px;">🛡 On the deployed site, server keys handle everything. Paste your own only if you want to override.</div>

          <label>What do you want to watch?</label>
          <div class="row">
            <input id="ai-query-input" type="text" placeholder='e.g. "मुझे ताज़ा खबरें live दिखाओ"' style="flex:1;" />
            <button id="ai-mic-button" title="Voice input" style="background: linear-gradient(135deg, #06b6d4, #6366f1); color: white; border: none; border-radius: 999px; width: 36px; height: 36px; cursor: pointer; flex-shrink:0;">&#x1F3A4;</button>
          </div>

          <div class="chips" id="ai-chips"></div>

          <div style="margin-top: 6px;">
            <button class="btn ghost" id="ai-stats-toggle" style="font-size:10px;padding:4px 10px;width:100%;" title="Show last 10 AI picks">📊 AI Pick Stats ▾</button>
          </div>
          <div id="ai-stats-panel" style="display:none;margin-top:4px;font-size:10px;max-height:160px;overflow-y:auto;"></div>

          <div style="margin-top: 6px;">
            <button class="btn ghost" id="ai-why-toggle" style="font-size:10px;padding:4px 10px;width:100%;" title="Show TF-IDF candidates and AI reasoning">Why this channel? ▾</button>
          </div>
          <div class="actions">
            <button class="btn ghost" id="ai-cancel">Cancel</button>
            <button class="btn" id="ai-ask">Tune Channel →</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // ── Tri-provider key + toggle hydration ───────────────────────
      const wireProvider = (provider, storeKey, toggleStoreKey, defaultOn) => {
        const keyInput = modal.querySelector(`#ai-key-${provider}`);
        const toggle   = modal.querySelector(`#ai-toggle-${provider}`);
        if (keyInput) {
          keyInput.value = localStorage.getItem(storeKey) || '';
          keyInput.addEventListener('change', () => {
            const v = keyInput.value.trim();
            if (v) localStorage.setItem(storeKey, v);
            else localStorage.removeItem(storeKey);
            toast(`${provider} key ${v ? 'saved' : 'cleared'}`, '🔑', 'info');
          });
        }
        if (toggle) {
          // Default ON unless user has explicitly toggled off
          const stored = localStorage.getItem(toggleStoreKey);
          toggle.checked = stored !== 'false';
          toggle.addEventListener('change', () => {
            localStorage.setItem(toggleStoreKey, toggle.checked ? 'true' : 'false');
            toast(`${provider} ${toggle.checked ? 'enabled' : 'disabled'}`,
                  toggle.checked ? '✅' : '⏸', 'info');
          });
        }
      };
      wireProvider('gemini',     AI_GEMINI_KEY_STORE,     AI_GEMINI_ON_STORE,     true);
      wireProvider('groq',       AI_GROQ_KEY_STORE,       AI_GROQ_ON_STORE,       true);
      wireProvider('openrouter', AI_OPENROUTER_KEY_STORE, AI_OPENROUTER_ON_STORE, true);

      // Mode selector
      const modeSelect = modal.querySelector('#ai-mode-select');
      if (modeSelect) {
        modeSelect.value = localStorage.getItem(AI_MODE_STORE) || 'auto';
        modeSelect.addEventListener('change', () => {
          localStorage.setItem(AI_MODE_STORE, modeSelect.value);
          toast(`Mode: ${modeSelect.value}`, '🎛', 'info');
        });
      }

      // Toggle: AI on/off
      const toggle = modal.querySelector('#ai-toggle-modal');
      toggle.addEventListener('change', () => {
        aiEnabled = toggle.checked;
        localStorage.setItem(AI_ENABLED_STORE, aiEnabled ? 'true' : 'false');
        fab.classList.toggle('off', !aiEnabled);
        toast(`AI Channel Picker: ${aiEnabled ? 'ON' : 'OFF'}`,
              '🤖', aiEnabled ? 'success' : 'info');
      });

      // Toggle: TV keyboard-shortcut lock
      const kbToggle = modal.querySelector('#ai-kblock-modal');
      kbToggle.addEventListener('change', () => {
        kbLocked = kbToggle.checked;
        localStorage.setItem(KB_LOCK_STORE, kbLocked ? 'true' : 'false');
        fab.classList.toggle('kblocked', kbLocked);
        toast(kbLocked
                ? '⌨️ TV shortcuts LOCKED — keys just type. Untoggle to use P/S/M/0…9.'
                : '⌨️ TV shortcuts UNLOCKED — P=power, S=source, M=menu, etc.',
              '⌨️', kbLocked ? 'success' : 'info');
      });

      // Toggle: AI Tune Channel Shortcuts
      const tuneShortcutsToggle = modal.querySelector('#ai-tune-shortcuts-modal');
      tuneShortcutsToggle.addEventListener('change', () => {
        tuneShortcutsEnabled = tuneShortcutsToggle.checked;
        localStorage.setItem(AI_TUNE_SHORTCUTS_STORE, tuneShortcutsEnabled ? 'true' : 'false');
        toast(tuneShortcutsEnabled
                ? '🎯 AI Tune Shortcuts ON — Ctrl+Enter or Enter to tune.'
                : '🎯 AI Tune Shortcuts OFF.',
              '🎯', tuneShortcutsEnabled ? 'success' : 'info');
      });

      // Suggestion chips
      const chips = modal.querySelector('#ai-chips');
      const queryInput = modal.querySelector('#ai-query-input');
      [
        "show me live news right now",
        "मुझे prime time debate देखना है",
        "morning news please",
        "Delhi election exit poll",
        "Bollywood / saas bahu serial",
        "2019 Special Report Edition",
      ].forEach(p => {
        const c = document.createElement('button');
        c.className = 'chip'; c.type = 'button'; c.textContent = p;
        c.addEventListener('click', () => { queryInput.value = p; queryInput.focus(); });
        chips.appendChild(c);
      });

      // Open / close
      function openModal() { modal.classList.add('open'); setTimeout(() => queryInput.focus(), 50); }
      function closeModal() { 
        modal.classList.remove('open');
        var existingPanel = document.getElementById('ai-why-panel');
        if (existingPanel) existingPanel.remove();
        var toggle = document.getElementById('ai-why-toggle');
        if (toggle) toggle.textContent = 'Why this channel? ▾';
        var statsPanel = document.getElementById('ai-stats-panel');
        if (statsPanel) statsPanel.style.display = 'none';
        var statsToggle = document.getElementById('ai-stats-toggle');
        if (statsToggle) statsToggle.textContent = '\uD83D\uDCCA AI Pick Stats \u25BE';
        var existingBadge = document.querySelector('.provider-badge');
        if (existingBadge) existingBadge.remove();
      }
      fab.addEventListener('click', openModal);
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
      modal.querySelector('#ai-cancel').addEventListener('click', closeModal);
      modal.querySelector('#ai-why-toggle').addEventListener('click', renderWhyPanel);
      modal.querySelector('#ai-stats-toggle').addEventListener('click', renderStatsPanel);
      var micBtn = modal.querySelector('#ai-mic-button');
      if (micBtn) micBtn.addEventListener('click', toggleVoiceInput);

      // Submit
      function submit() {
        const q = queryInput.value.trim();
        if (!q) return;
        closeModal();
        ask(q);
      }
      modal.querySelector('#ai-ask').addEventListener('click', submit);

      // Global keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Ctrl+Enter or Enter to tune when modal is open and shortcuts enabled
        if ((e.key === 'Enter') && modal.classList.contains('open') && tuneShortcutsEnabled) {
          e.preventDefault();
          e.stopImmediatePropagation();
          submit();
          return;
        }
        if (e.key && e.key.toLowerCase() === 'i' && e.altKey) {
          const t = e.target;
          const tag = (t && t.tagName) || '';
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
          e.preventDefault();
          modal.classList.contains('open') ? closeModal() : openModal();
        } else if (e.key === 'Escape' && modal.classList.contains('open')) {
          closeModal();
        }
      });
    }

    // ── 6b. Voice recognition (Web Speech API) ──────────────────────
    var voiceRecognition = null;
    var isListening = false;

    function initVoiceRecognition() {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        var btn = document.getElementById('ai-mic-button');
        if (btn) btn.style.display = 'none';
        return;
      }
      voiceRecognition = new SpeechRecognition();
      voiceRecognition.continuous = false;
      voiceRecognition.interimResults = false;
      voiceRecognition.maxAlternatives = 1;
      voiceRecognition.lang = 'hi-IN';
      voiceRecognition.onstart = function() {
        isListening = true;
        var btn = document.getElementById('ai-mic-button');
        if (btn) {
          btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          btn.textContent = '\uD83D\uDD34';
          btn.title = 'Listening\u2026 click to stop';
        }
        toast('\uD83C\uDFA4 Listening\u2026 speak your query', '\uD83C\uDFA4', 'info');
      };
      voiceRecognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        var input = document.getElementById('ai-query-input');
        if (input) {
          input.value = transcript;
          input.focus();
          toast('Heard: "' + transcript + '"', '\u2713', 'success');
        }
      };
      voiceRecognition.onerror = function(event) {
        toast('Voice error: ' + event.error, '\u26A0\uFE0F', 'error');
        resetMicButton();
      };
      voiceRecognition.onend = function() {
        isListening = false;
        resetMicButton();
      };
    }
    function resetMicButton() {
      var btn = document.getElementById('ai-mic-button');
      if (!btn) return;
      btn.style.background = 'linear-gradient(135deg, #06b6d4, #6366f1)';
      btn.textContent = '\uD83C\uDFA4';
      btn.title = 'Voice input';
    }
    function toggleVoiceInput() {
      if (!voiceRecognition) initVoiceRecognition();
      if (!voiceRecognition) return;
      if (isListening) {
        voiceRecognition.stop();
      } else {
        try {
          voiceRecognition.start();
        } catch (e) {
          toast('Voice start failed: ' + e.message, '\u26A0\uFE0F', 'error');
        }
      }
    }

    // ── 7. Expose a tiny public API for debugging / external triggers
    window.AI_PICKER = {
      ask,
      retrieve: (q) => retrieve(q, INDEX, 5),
      setKey: (k) => { localStorage.setItem(AI_GEMINI_KEY_STORE, k); },
      isEnabled: () => aiEnabled,
      setKbLocked: (val) => { kbLocked = val; },
      setTuneShortcuts: (val) => { tuneShortcutsEnabled = val; },
      voiceToggle: toggleVoiceInput,
      version: '1.0.27.0',
      mode: 'server-first (Vercel Edge) with client-key + retrieval fallbacks',
    };

    injectUI();
    console.log('%c[AI Channel Picker] ready · v1.0.27 · server-first via /api/ai-pick · press I',
                'color:#06b6d4;font-weight:bold;');
  }
})();
