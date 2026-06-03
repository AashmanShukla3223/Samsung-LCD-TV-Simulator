# OpenCode Master Prompt — Samsung C5000 Simulator v1.0.26 (Silver Tier — Features Only)

> **Project:** Samsung-LCD-TV-Simulator
> **Repo:** `github.com/AashmanShukla3223/Samsung-LCD-TV-Simulator`
> **Live URL:** `https://samsung-lcd-tv.vercel.app`
> **Current version:** `APP_VERSION = '1.0.25'`
> **Target version:** `APP_VERSION = '1.0.26'`
> **Primary file:** `Samsung_TV.html` (~255 KB, ~4,637 lines, vanilla HTML/CSS/JS)
> **Client AI file:** `ai-picker.js` (~44 KB, ~888 lines)
> **Server AI endpoint:** `api/ai-pick.js` (tri-provider race: Groq + Gemini + OpenRouter)
> **Release scope:** Silver features ONLY. **No new channels. No new MP4 content.** Channels deferred to v1.0.28-30.

---

## 🎯 Mission

Ship **v1.0.26 — Silver Tier (Features Only)**, implementing 9 medium-impact refinements across 6 categories:

1. **Channels (0 — code-level only, no work in this category)**: Skip — was code-only in v1.0.25, no further work needed in Silver
2. **OSD Menus (2)**: Wire 2-3 Picture menu sliders to actually affect video + Energy Saving modes
3. **AI Picker (2)**: Voice input via Web Speech API + "No exact match" friendly message
4. **USB Profiles (1)**: USB Eject animation + soft eject sound
5. **Filesystem (2)**: File metadata (size/date/type-icon) + "Recently Viewed" pseudo-folder
6. **Bonus (2)**: Customizable :55 exhale schedule + EPG (Electronic Program Guide) overlay

**Each subsystem is independent.** Implement in any order. No phase blocks another.

**Tone of this release:** Polish, not novelty. Where v1.0.25 added headline features users notice immediately, v1.0.26 adds quiet refinements that make existing features feel more complete. Period-authentic finish work.

---

## 📐 Critical Architecture Constraints (do not violate)

### Preserve everything shipped in v1.0.25
- The `dishChangeChannel` wrap-around logic — don't touch
- The "About This TV" / "Picture Test" OSD modals — don't break
- The AI Picker provider badge + "Why?" panel — don't break
- The 3 new USB profiles (`music`, `vacation`, `older-firmware`) — keep all 7 profiles working
- `usbSaveState` persistence — already wired; just extend
- Retail Demo Mode / channel bugs / Blue button SAP — don't regress

### Decoupled version system (NEVER touch this pattern)
- `APP_VERSION` in HTML (~line 1141) = currently-installed firmware
- `GH`, `GH2`, ..., `GH8` = asset bundle URL pointers, independent of APP_VERSION
- `/version.json` (Vercel root) = Internet OTA manifest
- `/dishtv/firmware.json` = Broadcast OTA manifest
- `/usb-images/*.json` = USB profile manifests
- Bump `APP_VERSION` ONLY at the end (Phase 7), with matching manifest updates

### Tri-provider AI system
- `ai-picker.js`: TF-IDF + UI + race orchestration (now 44 KB after v1.0.25)
- `api/ai-pick.js`: serverless function — already returns `source`, `model`, `latency_ms`
- Voice input (Category 3.1) feeds the existing race-mode pipeline — don't create a parallel system

### Single-file static HTML constraint
- No build step. No `package.json` for the Samsung repo.
- All changes go into `Samsung_TV.html` or sibling JSON files
- `vercel.json` must remain valid (currently configured for static-only deploy)

### What NOT to touch
- ❌ Do not modify `api/ai-pick.js` core race logic
- ❌ Do not modify the OTA install flow itself
- ❌ Do not change `VERCEL_URL` constant
- ❌ Do not re-introduce `usbSyncCurrentState()` boot call
- ❌ Do not add ANY new channels with new MP4s — that's v1.0.28-30 scope
- ❌ Do not add `package.json` to this repo

---

## 🛠️ Implementation Phases

### Phase 0 — Pre-flight (10 min)

1. Read current `Samsung_TV.html` end-to-end (or at least scan the structural landmarks)
2. Read current `ai-picker.js` end-to-end
3. Confirm `APP_VERSION` is currently `'1.0.25'`
4. Verify all v1.0.25 features still work — load the live site, click around briefly
5. Backup `Samsung_TV.html` and `ai-picker.js` to `.patch-backups/<timestamp>/`

---

### Phase 1 — Category 2: OSD Menus (1-2 hours)

(Note: Category 1 — Channels — has no Silver-tier work. Skip.)

#### 1.1 — Wire 2-3 Picture menu sliders to affect video

Locate the existing Picture menu (Picture / Brightness / Contrast / Color / Sharpness sliders). Currently they likely have UI but no functional effect.

Wire these specific ones:

**Brightness slider** → applies CSS `filter: brightness()` to the active input video element

```js
function applyPictureBrightness(value) {
  // value is 0-100, map to CSS filter 0.5 - 1.5
  const cssBrightness = 0.5 + (value / 100);
  document.querySelectorAll('#dishVideo, #wiiVideo, #appleVideo, #ps3Video, #tvVideo').forEach(v => {
    v.style.filter = `brightness(${cssBrightness}) saturate(${currentColorFilter || 1}) contrast(${currentContrastFilter || 1})`;
  });
  localStorage.setItem('samsung_picture_brightness', value);
}
```

**Color (saturation) slider** → applies CSS `filter: saturate()`

```js
function applyPictureColor(value) {
  // value is 0-100, map to 0 - 2
  const cssSaturate = value / 50;
  currentColorFilter = cssSaturate;
  applyPictureCombinedFilters();
}
```

**Contrast slider** → applies CSS `filter: contrast()`

```js
function applyPictureContrast(value) {
  // value is 0-100, map to 0.5 - 1.5
  const cssContrast = 0.5 + (value / 100);
  currentContrastFilter = cssContrast;
  applyPictureCombinedFilters();
}
```

Combine all three into a single `applyPictureCombinedFilters()` helper that sets the final CSS string on all video elements. Each slider update calls this helper. State persists to localStorage and restores on boot.

**Sharpness slider can stay non-functional** (CSS doesn't have a true sharpness filter without complex SVG hacks — too much complexity for this release).

#### 1.2 — Energy Saving modes in Picture menu

Add a new menu entry under Picture: **"Energy Saving"** with 5 sub-options: `Off / Low / Medium / High / Auto`

Each value applies a progressive brightness reduction:

```js
const ENERGY_MULTIPLIERS = {
  'off':    1.00,
  'low':    0.90,
  'medium': 0.75,
  'high':   0.55,
  'auto':   null  // calculated from time of day
};

function applyEnergySaving(mode) {
  let multiplier = ENERGY_MULTIPLIERS[mode];
  if (mode === 'auto') {
    const hour = new Date().getHours();
    multiplier = (hour >= 18 || hour < 6) ? 0.65 : 0.95;  // dimmer at night
  }
  currentEnergyMultiplier = multiplier;
  applyPictureCombinedFilters();

  // Show an energy-saving indicator badge
  const indicator = document.getElementById('energySavingIndicator') || createEnergyIndicator();
  if (mode === 'off') {
    indicator.style.display = 'none';
  } else {
    indicator.style.display = 'flex';
    indicator.textContent = `🌱 Energy: ${mode.toUpperCase()}`;
  }

  localStorage.setItem('samsung_energy_mode', mode);
}

function createEnergyIndicator() {
  const ind = document.createElement('div');
  ind.id = 'energySavingIndicator';
  ind.style.cssText = 'position: fixed; top: 12px; right: 12px; background: rgba(34, 197, 94, 0.85); color: white; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; z-index: 60; display: none;';
  document.body.appendChild(ind);
  return ind;
}
```

Combine with the existing brightness logic: the final brightness applied is `userBrightness × energyMultiplier`.

State persists; restored on boot.

**Acceptance for Phase 1:**
- ✅ Brightness slider visibly changes video luminosity
- ✅ Color/saturation slider visibly changes color intensity
- ✅ Contrast slider visibly changes contrast
- ✅ All three filters combine correctly (not overriding each other)
- ✅ Settings persist across page reloads
- ✅ Energy Saving menu has 5 options
- ✅ Each progressive mode dims the screen further
- ✅ Auto mode dims after 6 PM, brightens during day
- ✅ Energy indicator badge appears in corner when active

---

### Phase 2 — Category 3: AI Picker improvements (1-2 hours)

#### 2.1 — Voice input via Web Speech API

In `ai-picker.js`, add a microphone button to the AI Picker modal next to the text input.

```html
<button id="ai-mic-button" title="Voice input" style="background: linear-gradient(135deg, #06b6d4, #6366f1); color: white; border: none; border-radius: 999px; width: 36px; height: 36px; cursor: pointer; margin-left: 6px;">
  🎤
</button>
```

JS implementation:

```js
let voiceRecognition = null;
let isListening = false;

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // Hide the mic button entirely on unsupported browsers
    const btn = document.getElementById('ai-mic-button');
    if (btn) btn.style.display = 'none';
    return;
  }

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;

  // Use Hindi as primary, fall back to English
  voiceRecognition.lang = 'hi-IN';

  voiceRecognition.onstart = () => {
    isListening = true;
    const btn = document.getElementById('ai-mic-button');
    if (btn) {
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btn.textContent = '🔴';
      btn.title = 'Listening… click to stop';
    }
    toast('🎤 Listening… speak your query', '🎤', 'info');
  };

  voiceRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById('ai-query-input');
    if (input) {
      input.value = transcript;
      input.focus();
      toast(`Heard: "${transcript}"`, '✓', 'success');
    }
  };

  voiceRecognition.onerror = (event) => {
    toast(`Voice error: ${event.error}`, '⚠️', 'error');
    resetMicButton();
  };

  voiceRecognition.onend = () => {
    isListening = false;
    resetMicButton();
  };
}

function resetMicButton() {
  const btn = document.getElementById('ai-mic-button');
  if (!btn) return;
  btn.style.background = 'linear-gradient(135deg, #06b6d4, #6366f1)';
  btn.textContent = '🎤';
  btn.title = 'Voice input';
}

function toggleVoiceInput() {
  if (!voiceRecognition) initVoiceRecognition();
  if (!voiceRecognition) return;  // unsupported

  if (isListening) {
    voiceRecognition.stop();
  } else {
    try {
      voiceRecognition.start();
    } catch (e) {
      toast(`Voice start failed: ${e.message}`, '⚠️', 'error');
    }
  }
}

// Wire the button:
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('ai-mic-button');
  if (btn) btn.addEventListener('click', toggleVoiceInput);
});
```

Wire the mic button to call `toggleVoiceInput()` when the AI Picker modal opens.

#### 2.2 — "No exact match" friendly message

In the AI Picker's response-handling logic (in `ai-picker.js`), detect when:
- The top TF-IDF candidate score is < 0.15 (very low confidence)
- OR the LLM's chosen channel matches but with low semantic confidence
- OR `pick.confidence` field is `low` (if you add this to the server response)

When detected, show a friendly toast before/instead of the result:

```js
function checkLowConfidencePick(candidates, pick) {
  if (!candidates.length) return false;
  const topScore = candidates[0].score;

  if (topScore < 0.15) {
    toast(
      `No exact match for "${currentQuery}". Closest: ${pick.name}. Try a different query?`,
      '🤔',
      'info'
    );
    return true;
  }
  return false;
}
```

Call this in the response handler before tuning the channel.

**Acceptance for Phase 2:**
- ✅ Microphone button appears in AI Picker modal (or is hidden on unsupported browsers)
- ✅ Clicking mic triggers browser permission prompt on first use
- ✅ Speaking populates the query input with the transcript
- ✅ Mic button shows visual state when listening (red, "🔴")
- ✅ Voice errors show friendly toasts
- ✅ Low-confidence picks trigger a "🤔 No exact match" toast

---

### Phase 3 — Category 4: USB Eject animation + sound (30 min)

When the user disconnects the USB (via the Eject button or via switching profiles), play:

1. **A soft "click" sound** synthesized via the existing `tvSynth` audio context
2. **A small slide-down animation** on the USB status badge in the chassis

```js
function playUsbEjectSound() {
  if (!tvSynth || !tvSynth.context) return;
  const ctx = tvSynth.context;

  // Soft mechanical click — short triangle wave, quick decay
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function animateUsbEject() {
  const badge = document.getElementById('usbStatusBadge') || document.querySelector('[class*="usb-badge"]');
  if (!badge) return;

  badge.style.transition = 'transform 0.4s ease-in, opacity 0.4s ease-in';
  badge.style.transform = 'translateY(20px)';
  badge.style.opacity = '0';

  setTimeout(() => {
    badge.style.display = 'none';
    badge.style.transform = '';
    badge.style.opacity = '';
    badge.style.transition = '';
  }, 450);
}

// Modify usbDisconnect to call both:
function usbDisconnect() {
  // ... existing disconnect logic ...
  playUsbEjectSound();
  animateUsbEject();
}
```

**Acceptance for Phase 3:**
- ✅ Disconnecting USB plays a brief mechanical-click sound
- ✅ USB status badge slides down + fades out
- ✅ Re-inserting USB shows the badge again normally
- ✅ Sound respects current volume / mute state (use tvSynth's master gain)

---

### Phase 4 — Category 5: Filesystem refinements (1-2 hours)

#### 4.1 — File metadata in browser

In the USB file browser rendering code, add metadata columns next to each filename:

```js
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (filename.endsWith('/')) return '📁';
  if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return '🎵';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
  if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) return '🎬';
  if (['json'].includes(ext)) return '⚙️';
  if (['html', 'htm'].includes(ext)) return '📦';
  if (['txt', 'md', 'log'].includes(ext)) return '📄';
  if (['xml'].includes(ext)) return '📋';
  return '📄';
}

function humanFileSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileSize(value) {
  // If value is a URL, we don't know the size — return placeholder
  if (typeof value === 'string' && value.startsWith('http')) {
    return '— remote —';
  }
  // If value is a string of literal content, return its char length
  if (typeof value === 'string') {
    return humanFileSize(value.length);
  }
  return '0 B';
}

function getModifiedDate(filename) {
  // Store modified dates in localStorage keyed by USB-profile + filename
  const key = `usbmtime_${virtualUSB.label}_${filename}`;
  const stored = localStorage.getItem(key);
  if (stored) return new Date(parseInt(stored)).toLocaleDateString('en-IN');
  return '—';
}
```

In the row-rendering function, update the layout:

```html
<div class="usb-file-row">
  <span class="icon">${getFileIcon(filename)}</span>
  <span class="name">${filename}</span>
  <span class="size">${getFileSize(value)}</span>
  <span class="date">${getModifiedDate(filename)}</span>
</div>
```

CSS to make it look clean:

```css
.usb-file-row {
  display: grid;
  grid-template-columns: 24px 1fr 80px 100px;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
}
.usb-file-row:hover { background: rgba(255,255,255,0.05); }
.usb-file-row .icon { text-align: center; }
.usb-file-row .name { font-family: monospace; font-size: 11px; }
.usb-file-row .size, .usb-file-row .date {
  font-family: monospace;
  font-size: 10px;
  color: #94a3b8;
  text-align: right;
}
```

When `usbWriteFile` or `usbMkdir` is called, also write the current timestamp to the `usbmtime_*` localStorage key.

#### 4.2 — "Recently Viewed" pseudo-folder

In any USB profile's root, prepend a virtual `Recently Viewed/` folder that contains shortcuts to the last 5-10 files opened:

```js
let recentlyViewed = JSON.parse(localStorage.getItem('samsung_recently_viewed') || '[]');
const MAX_RECENT = 10;

function trackFileView(filename, profileLabel) {
  const entry = { filename, profileLabel, timestamp: Date.now() };
  recentlyViewed = recentlyViewed.filter(e => e.filename !== filename || e.profileLabel !== profileLabel);
  recentlyViewed.unshift(entry);
  recentlyViewed = recentlyViewed.slice(0, MAX_RECENT);
  localStorage.setItem('samsung_recently_viewed', JSON.stringify(recentlyViewed));
}

function getRecentlyViewedForProfile(profileLabel) {
  return recentlyViewed.filter(e => e.profileLabel === profileLabel);
}
```

In the file-browser render logic, when at root of any USB:

```js
if (currentPath === '/') {
  // Insert pseudo-folder at top
  const recents = getRecentlyViewedForProfile(virtualUSB.label);
  if (recents.length > 0) {
    renderRow({
      icon: '🕐',
      name: 'Recently Viewed/',
      size: `${recents.length} items`,
      date: '— virtual —',
      isPseudo: true,
      onClick: () => navigateToRecentlyViewed()
    });
  }
}

function navigateToRecentlyViewed() {
  // Render a special list of the recents instead of normal dir contents
  const recents = getRecentlyViewedForProfile(virtualUSB.label);
  // ... render the recents list with click-to-open ...
}
```

Add a "← Back" button to exit the Recently Viewed view.

Call `trackFileView(filename, virtualUSB.label)` from wherever files are opened (MP3 player, photo viewer, file editor entry).

**Acceptance for Phase 4:**
- ✅ Every file in USB browser shows icon + name + size + date columns
- ✅ Different file types get appropriate emoji icons
- ✅ Created/edited files have current timestamp; older files show `—`
- ✅ Recently Viewed/ pseudo-folder appears at root of any USB with viewing history
- ✅ Clicking Recently Viewed shows last 10 opened files for that profile
- ✅ Recently viewed persists across page reloads (it's in localStorage)

---

### Phase 5 — Category 6: Bonus features (1-2 hours)

#### 5.1 — Customizable :55 exhale schedule

In the Setup menu, add a new entry: **"AajTak Exhale Schedule"** with 3 sub-options:

- **Every Hour at :55** (current default behavior)
- **Once Daily at [user-picked time]** (default 9 PM)
- **Off**

Implementation:

```js
let exhaleMode = localStorage.getItem('samsung_exhale_mode') || 'hourly';
let exhaleDailyTime = parseInt(localStorage.getItem('samsung_exhale_daily_time') || '21'); // hour 0-23
let lastDailyExhaleDate = localStorage.getItem('samsung_last_daily_exhale') || '';

function shouldTriggerExhale() {
  const now = new Date();
  if (exhaleMode === 'off') return false;

  if (exhaleMode === 'hourly') {
    return now.getMinutes() === 55 && now.getSeconds() === 0;
  }

  if (exhaleMode === 'daily') {
    const today = now.toISOString().split('T')[0];
    if (now.getHours() === exhaleDailyTime && now.getMinutes() === 0 && lastDailyExhaleDate !== today) {
      lastDailyExhaleDate = today;
      localStorage.setItem('samsung_last_daily_exhale', today);
      return true;
    }
  }

  return false;
}

function setExhaleMode(mode) {
  exhaleMode = mode;
  localStorage.setItem('samsung_exhale_mode', mode);
  showToast(`AajTak Exhale: ${mode === 'off' ? 'OFF' : mode === 'hourly' ? 'Every Hour' : `Daily at ${exhaleDailyTime}:00`}`, '🌬️', 'info');
}
```

Modify the existing `startExhaleTimer` function to use `shouldTriggerExhale()` instead of hard-coding `:55`.

#### 5.2 — EPG (Electronic Program Guide) overlay

Add a new dedicated button on the DishTV remote (use an unused button if available; or repurpose an unused one with the label "GUIDE"). Pressing it shows a table overlay:

```html
<div id="epgOverlay" class="absolute inset-0 bg-black/90 z-50 hidden p-6 overflow-auto">
  <div class="max-w-2xl mx-auto bg-zinc-900 border border-amber-400/40 rounded-xl p-4">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-sm font-extrabold text-amber-400 uppercase tracking-widest">DishTV Program Guide</h2>
      <span class="text-[10px] text-zinc-400 font-mono" id="epgDateNow"></span>
    </div>
    <table class="w-full text-[11px] font-mono">
      <thead>
        <tr class="text-zinc-500 border-b border-zinc-700">
          <th class="text-left py-1">Time</th>
          <th class="text-left py-1">Channel</th>
          <th class="text-left py-1">Now Playing</th>
        </tr>
      </thead>
      <tbody id="epgRows"></tbody>
    </table>
    <button id="epgCloseBtn" class="mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-1.5 rounded text-[10px] uppercase">Close (Back)</button>
  </div>
</div>
```

Populate `epgRows` based on the current AajTak schedule mapped to time slots. Example data structure (hardcoded; reflects the real AajTak primetime grid):

```js
const EPG_DATA = [
  { time: '10:00 AM', channel: '124', showName: 'AajTak — Aaj Subah' },
  { time: '11:00 AM', channel: '131', showName: 'AajTak — Ek aur Ek Gyarah' },
  { time: '05:00 PM', channel: '136', showName: 'AajTak — Dangal' },  // future v1.0.28
  { time: '06:00 PM', channel: '126', showName: 'AajTak — Halla Bol' },
  { time: '06:30 PM', channel: '128', showName: 'AajTak — Halla Bol (Evening)' },
  { time: '07:00 PM', channel: '137', showName: 'AajTak — Desh Tak' },  // future v1.0.28
  { time: '08:30 PM', channel: '123', showName: 'AajTak — Special Report' },
  { time: '09:00 PM', channel: '133', showName: 'AajTak — Khabardar' },
  { time: '09:30 PM', channel: '127', showName: 'AajTak — Black and White' },  // future
  { time: '10:00 PM', channel: '127', showName: 'AajTak — Das Tak' }
];

function renderEPG() {
  const tbody = document.getElementById('epgRows');
  if (!tbody) return;
  tbody.innerHTML = EPG_DATA.map(row => `
    <tr class="border-b border-zinc-800 hover:bg-zinc-800/50">
      <td class="py-1 text-amber-400">${row.time}</td>
      <td class="py-1 text-zinc-300">Ch ${row.channel}</td>
      <td class="py-1 text-white">${row.showName}</td>
    </tr>
  `).join('');
  document.getElementById('epgDateNow').textContent = new Date().toLocaleString('en-IN');
}

function openEPG() {
  renderEPG();
  document.getElementById('epgOverlay').classList.remove('hidden');
  tvSynth.playFMNote(660, 0.15, 0.2);
}

function closeEPG() {
  document.getElementById('epgOverlay').classList.add('hidden');
}
```

Wire to a key — suggest `G` for Guide, or `i` (info) — and the BACK button on the DishTV remote.

**Acceptance for Phase 5:**
- ✅ Setup menu has "AajTak Exhale Schedule" option with 3 modes
- ✅ Switching modes immediately changes the exhale-trigger behavior
- ✅ Daily mode only fires once per day at the configured time
- ✅ EPG overlay opens with a press of `G` key or the dedicated remote button
- ✅ EPG shows AajTak primetime schedule
- ✅ Current channel is highlighted (optional bonus polish)
- ✅ Settings persist across reloads

---

### Phase 6 — Version bump + manifests (15 min)

After Phases 1-5 are verified:

**1. `Samsung_TV.html` (~line 1141):**
```diff
- let APP_VERSION = '1.0.25';
+ let APP_VERSION = '1.0.26';
```

**2. `version.json` (root):**
```json
{
  "version": "1.0.26",
  "release": "Silver Tier: Picture filters wired, Energy Saving modes, Voice input, Low-confidence AI hint, USB Eject sound + animation, File metadata, Recently Viewed, Custom exhale schedule, EPG overlay"
}
```

**3. `dishtv/firmware.json`:**
```json
{
  "broadcaster": "DishTV India",
  "carrier_signal": "NSS-6 95.0°E TP-3",
  "broadcast_started": "2026-05-29T18:00:00Z",
  "broadcast_loop_duration_minutes": 4,
  "target_models": ["Samsung BN59", "Samsung LE40C530", "Samsung UE32C5000"],
  "firmware": {
    "version": "1.0.26",
    "app_version": "1.0.26",
    "release_notes": "v1.0.26 Silver Tier — 9 polish features across 6 categories. No new channels.",
    "size_kb": 12567,
    "required_min_version": "1.0.0",
    "signed_by": "DishTV-Samsung Partnership Certificate 2010"
  }
}
```

**4. Commit + push:**
```bash
git add -A
git commit -m "v1.0.26 Silver Tier: 9 polish features across 6 categories"
git push
```

---

## ⚙️ Technical Constraints

1. **No new external dependencies.** Only existing CDN libs (Tailwind, Font Awesome, hls.js).
2. **No build step.** Samsung simulator remains single static HTML + sibling JS files.
3. **No `package.json` in Samsung repo.**
4. **Preserve all v1.0.25 functionality** — every existing feature must still work after v1.0.26.
5. **Test with `cache: 'no-store'`** on all manifest fetches.
6. **Idempotent code** — multiple loads / input switches / USB inserts must not produce duplicates or memory leaks.
7. **Web Speech API** is browser-only — gracefully degrade if `webkitSpeechRecognition` is unavailable (hide the mic button, don't error).
8. **CSS filters on video** — combine all three (brightness/saturate/contrast) into a single computed string; don't override one with another.
9. **Period-authentic styling** — use existing classes (`samsung-osd-bg`, `glass-panel`, `aero-font`); don't introduce new design languages.

---

## 🧪 Final Acceptance Test (run after Phase 6)

Walk through manually and verify:

1. **Power on TV.** APP_VERSION displays 1.0.26. ✅
2. **All v1.0.25 features still work:**
   - Channel wrap-around CH+/CH-
   - About This TV modal opens via Support
   - Picture Test cycles 4 patterns
   - AI Picker provider badge appears
   - AI Picker "Why?" panel works
   - All 7 USB profiles load (normal/empty/corrupted/multi-firmware/music/vacation/older-firmware)
   - Music USB plays MP3s
   - Vacation USB shows photos
   - Older Firmware USB triggers downgrade warning
   - User-created files persist
   - Retail Demo Mode cycles inputs
   - Channel bugs appear on DishTV
   - Blue button cycles subtitles
3. **NEW: Picture Brightness slider visibly changes video luminosity.** ✅
4. **NEW: Picture Color slider visibly changes saturation.** ✅
5. **NEW: Picture Contrast slider visibly changes contrast.** ✅
6. **NEW: All three picture filters combine correctly.** ✅
7. **NEW: Energy Saving menu has 5 modes; selecting any non-Off mode dims screen.** ✅
8. **NEW: Auto mode dims appropriately based on time of day.** ✅
9. **NEW: Energy indicator badge appears in corner when active.** ✅
10. **NEW: AI Picker shows mic button.** ✅
11. **NEW: Clicking mic triggers permission prompt; speaking populates the query.** ✅
12. **NEW: Vague query ("show me something") triggers low-confidence toast.** ✅
13. **NEW: Disconnecting USB plays click sound + slide-down animation.** ✅
14. **NEW: USB file browser shows icon/name/size/date columns.** ✅
15. **NEW: Different file types show appropriate emoji icons.** ✅
16. **NEW: Recently Viewed/ folder appears at USB root after viewing files.** ✅
17. **NEW: Setup → AajTak Exhale Schedule has 3 modes.** ✅
18. **NEW: Setting to "Off" disables :55 trigger.** ✅
19. **NEW: Pressing G (or assigned key) opens EPG overlay with AajTak schedule.** ✅
20. **NEW: All v1.0.26 settings persist across page reloads.** ✅
21. **Run "Check for Updates"** → "Up to date" at v1.0.26. All three OTA paths agree. ✅

If all 21 pass, v1.0.26 is ready to deploy.

---

## 🚀 Deployment Notes

1. Vercel auto-deploys on push. No manual trigger.
2. Test these live URLs after deploy:
   - `https://samsung-lcd-tv.vercel.app` — loads v1.0.26
   - `/version.json` — returns 1.0.26
   - All existing endpoints continue working
3. No env var changes needed.
4. No new files added at root — all changes are inside existing `Samsung_TV.html`, `ai-picker.js`, plus 2 small JSON manifest updates.
5. Rollback: Vercel dashboard → Deployments → previous v1.0.25 → "Promote to Production" (60 seconds).

---

## 🧭 Design Philosophy

This is a **polish release**. Where v1.0.25 added headline features, v1.0.26 makes existing things feel more complete. Subtle wins over flashy ones.

- ✅ Energy Saving modes — **every Samsung TV had this** in 2010, with the same 5-option ladder
- ✅ Picture filters that actually work — wires existing UI to existing video elements
- ✅ Voice input — anachronistic but on-brand for the "2026 brain in 2010 chassis" theme
- ✅ EPG overlay — **standard DishTV feature**, finally implemented
- ✅ File metadata — every real file browser has this; the simulator finally does too

**Slow is okay.** Authentic detail beats velocity. Period-authentic refinement.

---

## 📞 If You Get Stuck

1. Read `Samsung_TV.html` and `ai-picker.js` more carefully — most patterns are already established from v1.0.25
2. Check the live deployment for current behavior
3. Ask the user (Aashman) a specific narrow question

The user prefers correctness over speed. Bluffing or pattern-matching from generic TV simulators will produce wrong results. Stay grounded in *this specific simulator's* existing code.

---

**End of master prompt for v1.0.26.** Begin with Phase 0. Report after each phase. After Phase 6, run the 21-step Acceptance Test and report results before declaring v1.0.26 ready to deploy.

**Next release after this: v1.0.27 (Bronze Tier). Ask the user for a new OPENCODE_PROMPT.md when ready.**
