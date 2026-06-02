# OpenCode Master Prompt — Samsung C5000 Simulator v1.0.25 (Gold Tier — Features Only)

> **Project:** Samsung-LCD-TV-Simulator
> **Repo:** `github.com/AashmanShukla3223/Samsung-LCD-TV-Simulator`
> **Live URL:** `https://samsung-lcd-tv.vercel.app`
> **Current version:** `APP_VERSION = '1.0.24'`
> **Target version:** `APP_VERSION = '1.0.25'`
> **Primary file:** `Samsung_TV.html` (~230 KB, ~4,225 lines, vanilla HTML/CSS/JS)
> **Client AI file:** `ai-picker.js` (~37 KB)
> **Server AI endpoint:** `api/ai-pick.js` (tri-provider race: Groq + Gemini + OpenRouter)
> **Asset CDN:** GitHub Releases at `AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills`
> **Release scope:** Gold features ONLY. **No new channels. No new MP4 content.** Channels are deferred to v1.0.28-30.

---

## 🎯 Mission

Ship **v1.0.25 — Gold Tier (Features Only)**, implementing 13 high-impact features across 6 categories:

1. **Channels (3 code-level only)**: rename existing channels for consistency + CH wrap-around (NO new MP4s)
2. **OSD Menus (2)**: About This TV panel + Picture Test
3. **AI Picker (2)**: Provider+latency badge + "Why this channel?" panel
4. **USB Profiles (3)**: MUSIC_USB + VACATION_USB + OLDER_FIRMWARE_USB
5. **Filesystem (1)**: localStorage persistence for user-edited files
6. **Bonus (3)**: Retail Demo Mode + channel logos/bugs + Blue button SAP wiring

**Each subsystem is independent.** Implement in any order. No phase blocks another.

---

## 📐 Critical Architecture Constraints (do not violate)

### The decoupled version system (NEVER touch this pattern)
- `APP_VERSION` in HTML (~line 1141) = currently-installed firmware
- `GH`, `GH2`, ..., `GH8` = asset bundle URL pointers, independent of APP_VERSION
- `/version.json` (Vercel root) = Internet OTA manifest
- `/dishtv/firmware.json` = Broadcast OTA manifest
- `/usb-images/*.json` = USB profile manifests
- Bump `APP_VERSION` ONLY at the end (Phase 7), with matching manifest updates

### The tri-provider AI system (modify with care)
- `ai-picker.js` (root): TF-IDF + UI + race orchestration
- `api/ai-pick.js`: serverless function proxying to Groq + Gemini + OpenRouter
- The badge work (Category 3) modifies BOTH server response shape AND client display
- Do NOT change the race-mode logic or fallback chain

### Single-file static HTML constraint
- No build step. No `package.json` for the Samsung repo.
- All changes go into `Samsung_TV.html` or sibling JSON files
- New USB profile JSONs go in `usb-images/` directory
- `vercel.json` must remain valid (currently configured for static-only deploy)

### What NOT to touch
- ❌ Do not modify `api/ai-pick.js` core race logic (only ADD response fields)
- ❌ Do not modify the OTA install flow itself (only add UI around it)
- ❌ Do not change `VERCEL_URL` constant
- ❌ Do not re-introduce `usbSyncCurrentState()` boot call (the upgrade-loop bug fix must persist)
- ❌ Do not add ANY new channels with new MP4s — that's v1.0.28-30 scope
- ❌ Do not add `package.json` to this repo

---

## 🛠️ Implementation Phases

### Phase 0 — Pre-flight (10 min)

1. Read `Samsung_TV.html` to understand current structure
2. Read `ai-picker.js` to understand AI orchestration
3. Confirm `APP_VERSION` is currently `'1.0.24'`
4. Verify these public endpoints return 200:
   - `/Samsung_TV.html`, `/version.json`, `/dishtv/firmware.json`, `/ai-picker.js`
   - `/usb-images/{normal,empty,corrupted,multi-firmware}.json`
   - `/api/ai-pick` (returns JSON with `providers` field)
5. Backup `Samsung_TV.html` to `.patch-backups/<timestamp>/` before any edits

---

### Phase 1 — Category 1: Channels (code-only, 30 min)

**Goal:** Clean up existing channel data + add wrap-around behavior. No new channel content.

#### 1.1 — Rename channels for consistent format

In `Samsung_TV.html`, locate the `dishChannels` array (~line 1327). Apply consistent format `Channel N: AajTak — [Show] ([Time])` to all 13 AajTak channels:

```diff
- { name: "Channel 121: AajTak Main Bulletin", src: GH + "dishtv_source.mp4" },
+ { name: "Channel 121: AajTak — Main Bulletin", src: GH + "dishtv_source.mp4" },

- { name: "Channel 124: AajTak Aaj Subah", src: GH + "dishtv_source4.mp4" },
+ { name: "Channel 124: AajTak — Aaj Subah (10 AM)", src: GH + "dishtv_source4.mp4" },

- { name: "Channel 126: AajTak Halla Bol Prime (2014)", src: GH + "dishtv_source6.mp4" },
+ { name: "Channel 126: AajTak — Halla Bol (6 PM)", src: GH + "dishtv_source6.mp4" },

- { name: "Channel 133: AajTak Khabardar Prime", src: GH8 + "dishtv_source13.mp4" },
+ { name: "Channel 133: AajTak — Khabardar (9 PM)", src: GH8 + "dishtv_source13.mp4" },
```

Apply the same consistent format across all 13 channels. Drop random year suffixes ("(2014)", "(2019)") where they don't indicate time slot; add time slots where known from AajTak's actual broadcast grid (Halla Bol at 6 PM, Khabardar at 9 PM, Special Report at 8:30 PM, etc.). Use em-dash (`—`) between brand and show name for consistency.

Leave Channel 134 (AajTak Live) and Channel 135 (NDTV India Live) names unchanged.

#### 1.2 — Add CH+/CH- wrap-around

Locate `dishChangeChannel` function. Modify to wrap at array boundaries:

```js
function dishChangeChannel(direction) {
  if (direction === 'next') {
    dishChannel = (dishChannel + 1) % dishChannels.length;
  } else if (direction === 'prev') {
    dishChannel = (dishChannel - 1 + dishChannels.length) % dishChannels.length;
  }
  loadDishVideo();
  // ... preserve all existing code below
}
```

**Acceptance:**
- ✅ All 13 AajTak channel names follow `Channel N: AajTak — [Show] ([Time])` format
- ✅ Channels 134, 135 unchanged
- ✅ CH+ at last channel (135) wraps to first (121); CH- at first wraps to last

---

### Phase 2 — Category 2: OSD Menus (1-2 hours)

#### 2.1 — "About This TV" panel under Support menu

Add a new modal screen for the About page.

**HTML to add** (somewhere near existing `screenUpdateMethod` div):

```html
<div id="screenAboutTV" class="absolute inset-0 bg-black/95 flex flex-col justify-center items-center z-50 hidden px-6 text-center">
  <div class="max-w-sm samsung-osd-bg rounded-xl p-4 w-full">
    <h2 class="text-sm font-extrabold text-sky-400 uppercase tracking-widest mb-4 aero-font">About This TV</h2>
    <div class="text-left text-xs space-y-2 font-mono">
      <div class="flex justify-between"><span class="text-zinc-400">Model:</span> <span class="text-white" id="aboutTVModel">Samsung BN59-C5000</span></div>
      <div class="flex justify-between"><span class="text-zinc-400">Firmware:</span> <span class="text-emerald-400" id="aboutTVFirmware">v1.0.25</span></div>
      <div class="flex justify-between"><span class="text-zinc-400">Asset CDN:</span> <span class="text-white">GitHub Releases</span></div>
      <div class="flex justify-between"><span class="text-zinc-400">Region:</span> <span class="text-white">IN (India)</span></div>
      <div class="flex justify-between"><span class="text-zinc-400">Network:</span> <span class="text-emerald-400">● Connected</span></div>
      <div class="flex justify-between"><span class="text-zinc-400">Last update:</span> <span class="text-white" id="aboutTVDate"></span></div>
      <div class="flex justify-between"><span class="text-zinc-400">Manufacturer:</span> <span class="text-zinc-500 italic">Samsung Electronics (simulated)</span></div>
    </div>
    <button id="aboutTVCloseBtn" class="mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-1.5 rounded text-[10px] uppercase tracking-wider transition-all">Back</button>
  </div>
</div>
```

**JS wiring:**
- Add "About This TV" entry to Support category options array
- When activated, populate `aboutTVFirmware` with `APP_VERSION`, `aboutTVDate` with `new Date().toISOString().split('T')[0]`
- Show with `tvSynth.playFMNote(880, 0.12, 0.2)` for audio cue
- Back button or Escape returns to Support category

#### 2.2 — Picture Test in Self-Diagnosis

Add a Picture Test alongside the existing Sound Test under Self-Diagnosis.

**HTML structure** (4 sub-screens cycled with arrow keys):

```html
<div id="screenPictureTest" class="absolute inset-0 z-50 hidden">
  <div id="pictureTestPattern" class="w-full h-full"></div>
  <div class="absolute top-4 left-4 right-4 bg-black/70 p-2 rounded text-[10px] text-white font-mono text-center">
    <span id="pictureTestLabel">Picture Test 1/4: SMPTE Color Bars</span>
    <span class="text-zinc-400 ml-4">[◀▶] Cycle • [Back] Exit</span>
  </div>
</div>
```

**Patterns to render** (cycle via arrow keys):

1. **SMPTE color bars** — pure CSS/SVG, 7 vertical stripes:
   - White → Yellow → Cyan → Green → Magenta → Red → Blue
   - Each stripe = `width: 14.28%`, full height
2. **Grayscale gradient** — 11 vertical bars from black (`#000`) to white (`#fff`)
3. **Solid color tests** — full-screen red, green, blue (one per left/right press)
4. **Motion pattern** — animated diagonal stripes via CSS keyframes:
   ```css
   background: repeating-linear-gradient(45deg, #000 0 30px, #fff 30px 60px);
   animation: motion-test 3s linear infinite;
   @keyframes motion-test { from { background-position: 0 0; } to { background-position: 60px 60px; } }
   ```

**JS:**
- Track `pictureTestIndex` (0-3)
- Arrow left/right cycles + updates pattern + updates label text
- Back/Escape exits to Self-Diagnosis menu

**Acceptance:**
- ✅ Support menu has "About This TV" entry
- ✅ About modal shows v1.0.25 + current date
- ✅ Self-Diagnosis has "Picture Test" alongside Sound Test
- ✅ All 4 picture patterns cycle with arrow keys
- ✅ Both modals close cleanly via Back/Escape

---

### Phase 3 — Category 3: AI Picker improvements (1-2 hours)

#### 3.1 — Provider + latency badge in AI Picker result

**Server side (`api/ai-pick.js`):** Already returns `source`, `model`, `latency_ms`, `mode_used` in the successful response. **No server change needed.**

**Client side (`ai-picker.js`):**

Find the function that handles a successful AI Picker response (probably called something like `tuneTo` or similar — search for where `channel_number` from the API response is used).

After the channel is tuned, render a small badge in the AI Picker UI:

```js
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

  // Shorten model name for badge display
  const shortModel = (model || '').split('/').pop().split('-').slice(0, 2).join('-');

  const badge = document.createElement('div');
  badge.className = `provider-badge font-mono text-[10px] ${colorClass} animate-fade-in`;
  badge.style.cssText = 'position: absolute; bottom: 8px; right: 12px; padding: 4px 8px; background: rgba(0,0,0,0.6); border-radius: 4px; backdrop-filter: blur(4px);';
  badge.textContent = `${icon} ${source} · ${shortModel} · ${latency_ms}ms`;

  // Append to the AI Picker result container (find the right parent)
  const resultContainer = document.querySelector('#ai-modal') || document.body;
  resultContainer.appendChild(badge);

  // Auto-fade after 5 seconds
  setTimeout(() => {
    badge.style.transition = 'opacity 0.5s';
    badge.style.opacity = '0';
    setTimeout(() => badge.remove(), 500);
  }, 5000);
}
```

Call this function after the AI response is parsed and the channel tune is initiated.

#### 3.2 — "Why this channel?" expandable panel

Modify the AI Picker response handler to retain the candidates and reasoning in client memory after each query:

```js
let lastAIResponse = null;  // module-level

// After successful response:
lastAIResponse = {
  query: query,
  candidates: candidates,  // top-K from TF-IDF
  pick: response,  // the LLM's pick + reason
  timestamp: Date.now()
};
```

Add a small "Why?" toggle button below the AI Picker result. When clicked, render:

```js
function renderWhyPanel() {
  if (!lastAIResponse) return;
  const { query, candidates, pick } = lastAIResponse;

  const panel = document.createElement('div');
  panel.id = 'ai-why-panel';
  panel.className = 'why-panel';
  panel.style.cssText = 'padding: 12px; background: rgba(0,0,0,0.8); border-radius: 8px; margin-top: 8px; font-size: 11px; color: #e2e8f0;';

  panel.innerHTML = `
    <div style="font-weight: bold; color: #7dd3fc; margin-bottom: 8px;">Why Channel ${pick.channel_number}?</div>
    <div style="margin-bottom: 8px;">
      <strong>Top candidates from TF-IDF retrieval:</strong>
      <table style="width: 100%; margin-top: 4px; font-family: monospace; font-size: 10px;">
        ${candidates.slice(0, 5).map((c, i) => `
          <tr>
            <td>${i + 1}.</td>
            <td>Ch ${c.doc.number}</td>
            <td>${c.doc.name.substring(0, 30)}</td>
            <td style="text-align: right; color: ${c.doc.number === pick.channel_number ? '#10b981' : '#64748b'};">
              ${c.score.toFixed(3)}${c.doc.number === pick.channel_number ? ' ★' : ''}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
    <div>
      <strong>${pick.source}'s reasoning:</strong>
      <div style="font-style: italic; margin-top: 4px;">"${pick.reason}"</div>
    </div>
  `;

  // Append to the AI Picker result area
  document.querySelector('#ai-modal').appendChild(panel);
}
```

Toggle visibility on a button labeled "Why this channel? ▾" / "Hide ▴".

**Acceptance:**
- ✅ Every successful AI pick shows provider badge (color-coded by source)
- ✅ Latency matches server's reported `latency_ms`
- ✅ "Why?" button reveals candidates + reasoning panel
- ✅ Closing AI Picker dismisses both badge and panel cleanly

---

### Phase 4 — Category 4: USB Profiles (3-4 hours)

#### 4.1 — Create `usb-images/music.json`

```json
{
  "label": "MUSIC_USB",
  "description": "USB drive with audio tracks",
  "files": {
    "music/01_aajtak_signature.mp3": "https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills/releases/download/v1.0.5/aajtak.sound.test.mp3",
    "music/02_halla_bol_theme.mp3": "https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills/releases/download/v1.0.6/halla.bol.mp3",
    "music/03_batidao_speed.mp3": "https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills/releases/download/v1.0.5/Batidao.da.Madrugada.Speed.mp3",
    "music/04_soundtest_2010.mp3": "https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills/releases/download/v1.0/soundtest.mp3",
    "playlists/favorites.m3u": "# Samsung TV Favorites Playlist\nmusic/03_batidao_speed.mp3\nmusic/02_halla_bol_theme.mp3\nmusic/01_aajtak_signature.mp3"
  }
}
```

#### 4.2 — Create `usb-images/vacation.json`

```json
{
  "label": "VACATION_USB",
  "description": "USB with photos from vacation",
  "files": {
    "DCIM/100SAMSUNG/IMG_0001.jpg": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    "DCIM/100SAMSUNG/IMG_0002.jpg": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
    "DCIM/100SAMSUNG/IMG_0003.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
    "DCIM/100SAMSUNG/IMG_0004.jpg": "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800",
    "DCIM/100SAMSUNG/IMG_0005.jpg": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800",
    "metadata.txt": "Samsung BN59 Photo Collection\nFormat: JPEG\nTotal: 5 photos"
  }
}
```

#### 4.3 — Create `usb-images/older-firmware.json`

```json
{
  "label": "OLDER_FW_USB",
  "description": "USB with older firmware (triggers downgrade warning)",
  "files": {
    "version.json": "{\n  \"version\": \"1.0.10\",\n  \"release\": \"Samsung BN59 legacy firmware\",\n  \"date\": \"2026-05-25\"\n}",
    "Samsung_TV.html": "Samsung BN59 Firmware Package (Legacy)\n========================================\nVersion: 1.0.10\nNote: This is older than current firmware."
  }
}
```

#### 4.4 — Extend client to fetch new profiles

In `Samsung_TV.html`, locate `usbFetchProfiles` (~line 2604). Update profile names array:

```diff
- const profileNames = ['normal', 'empty', 'corrupted', 'multi-firmware'];
+ const profileNames = ['normal', 'empty', 'corrupted', 'multi-firmware', 'music', 'vacation', 'older-firmware'];
```

#### 4.5 — Media player overlay for MUSIC_USB MP3 files

When user clicks an MP3 in MUSIC_USB, instead of opening the file editor, show:

```html
<div id="usbMediaPlayer" class="absolute inset-0 bg-black/90 z-60 hidden flex-col items-center justify-center">
  <div class="bg-zinc-900 border border-sky-400/30 rounded-xl p-6 max-w-md w-full">
    <div class="text-center mb-4">
      <div class="text-xs text-zinc-400 mb-1">Now Playing</div>
      <div id="mediaPlayerTitle" class="text-sm text-white font-bold"></div>
    </div>
    <audio id="mediaPlayerAudio" controls class="w-full mb-2"></audio>
    <div id="mediaPlayerTime" class="text-[10px] text-zinc-500 font-mono text-center mb-3"></div>
    <button id="mediaPlayerClose" class="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2 rounded text-[10px] uppercase tracking-wider">Close</button>
  </div>
</div>
```

JS: detect `.mp3` files in usbClickEnter handler, populate `mediaPlayerTitle` + `mediaPlayerAudio.src` (use the URL stored in the USB file entry), call `play()`.

#### 4.6 — Photo viewer for VACATION_USB JPG files

When user clicks a `.jpg` file in VACATION_USB:

```html
<div id="usbPhotoViewer" class="absolute inset-0 bg-black z-60 hidden flex-col items-center justify-center">
  <img id="photoViewerImg" class="max-w-full max-h-[80%] object-contain" />
  <div class="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
    <button id="photoViewerPrev" class="bg-zinc-800 text-white px-4 py-2 rounded">← Previous</button>
    <span id="photoViewerCounter" class="text-white text-xs">Photo 1 of 5</span>
    <button id="photoViewerNext" class="bg-zinc-800 text-white px-4 py-2 rounded">Next →</button>
    <button id="photoViewerClose" class="bg-red-700 text-white px-4 py-2 rounded">Close</button>
  </div>
</div>
```

JS: maintain a sorted list of JPGs in the current directory; prev/next cycles through them; arrow keys also work.

#### 4.7 — Downgrade warning for OLDER firmware

Modify USB version-check logic (~line 2498) to handle the version-older case:

```js
if (verData.version) {
  if (isNewerVersion(verData.version, APP_VERSION)) {
    // existing install flow
    recordPendingUpdate('usb', verData.version, 'USB v' + verData.version);
    // ... existing code
  } else if (verData.version === APP_VERSION) {
    alert('This version (' + verData.version + ') matches the currently installed firmware. No update needed.');
  } else {
    // NEW: downgrade warning
    const confirmed = confirm(
      '⚠ DOWNGRADE WARNING\n\n' +
      'This USB contains v' + verData.version + ', which is OLDER than ' +
      'the currently installed firmware (v' + APP_VERSION + ').\n\n' +
      'Downgrading firmware is not recommended and may cause feature loss. ' +
      'Continue anyway?'
    );
    if (confirmed) {
      usbCloseBrowser();
      showToast('Installing downgrade to v' + verData.version + '...', '<i class="fa-solid fa-usb"></i>', 'warning');
      showUpdateOverlay(verData.version);
    }
  }
}
```

**Acceptance:**
- ✅ All 7 USB profiles (`normal`, `empty`, `corrupted`, `multi-firmware`, `music`, `vacation`, `older-firmware`) load via the profile dropdown
- ✅ MUSIC_USB plays MP3s via media player overlay
- ✅ VACATION_USB shows JPGs via photo viewer with prev/next
- ✅ OLDER_FIRMWARE_USB triggers downgrade warning when version.json is clicked
- ✅ All overlays close cleanly via Close button or BACK key

---

### Phase 5 — Category 5: Filesystem persistence (1 hour)

**Goal:** User-created/edited files survive page reloads.

In `Samsung_TV.html`:

1. Verify `usbSaveState()` is called after EVERY mutation in:
   - `usbWriteFile`
   - `usbDeleteFile`
   - `usbMkdir`
   - (Any other function that modifies `virtualUSB.files`)

2. Verify `usbLoadState()` runs on `window.onload` and properly restores `virtualUSB.files` from localStorage.

3. Add a "Reset USB to defaults" button in the USB browser footer:

```html
<button id="usbResetBtn" class="bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider" title="Restore profile to original content">
  Reset USB
</button>
```

When clicked, re-fetch the current profile's JSON from Vercel and replace `virtualUSB.files` with the original content, then `usbSaveState()` to persist.

**Acceptance:**
- ✅ Edit a file in USB browser, reload page, change persists
- ✅ Create a new file/folder, reload page, it's still there
- ✅ Delete a file, reload page, deletion sticks
- ✅ "Reset USB to defaults" button restores original profile content

---

### Phase 6 — Category 6: Bonus features (3-4 hours)

#### 6.1 — Retail Demo Mode

Add to Setup menu category:

```js
// In Setup options array, add:
{
  name: "Retail Demo Mode",
  value: localStorage.getItem('samsung_demo_mode') === 'true' ? 'On' : 'Off',
  onActivate: toggleDemoMode
}
```

Implement:

```js
let demoModeTimer = null;
const DEMO_INPUTS = [0, 1, 2, 3, 4]; // cycle through all input sources
let demoInputIdx = 0;

function toggleDemoMode() {
  const enabled = localStorage.getItem('samsung_demo_mode') !== 'true';
  localStorage.setItem('samsung_demo_mode', enabled ? 'true' : 'false');

  if (enabled) {
    startDemoMode();
    showToast('Retail Demo Mode: ON', '<i class="fa-solid fa-tv"></i>', 'info');
  } else {
    stopDemoMode();
    showToast('Retail Demo Mode: OFF', '<i class="fa-solid fa-tv"></i>', 'info');
  }
}

function startDemoMode() {
  demoModeTimer = setInterval(() => {
    demoInputIdx = (demoInputIdx + 1) % DEMO_INPUTS.length;
    switchInput(DEMO_INPUTS[demoInputIdx]);
    showFloatingDemoBanner();
  }, 30000); // every 30 seconds
}

function stopDemoMode() {
  if (demoModeTimer) clearInterval(demoModeTimer);
  demoModeTimer = null;
}

function showFloatingDemoBanner() {
  const banner = document.createElement('div');
  banner.className = 'demo-banner';
  banner.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(245, 158, 11, 0.9); color: black; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 11px; z-index: 80; animation: fade-in-out 4s;';
  banner.textContent = '📺 Samsung BN59 — Smart 1080p LCD — On Display';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
}
```

On boot, if `samsung_demo_mode === 'true'`, call `startDemoMode()`.

#### 6.2 — Channel logos / bugs overlay

In the DishTV input overlay (the div containing `inputDishTV`), add a corner bug element:

```html
<div id="channelBug" class="absolute top-4 right-4 z-20 transition-opacity duration-300"></div>
```

JS function to update the bug based on current channel:

```js
function updateChannelBug() {
  const bug = document.getElementById('channelBug');
  if (!bug) return;
  const channelName = dishChannels[dishChannel]?.name || '';

  if (channelName.includes('AajTak')) {
    bug.innerHTML = `
      <div style="background: linear-gradient(135deg, #DC2626, #EAB308); padding: 6px 12px; border-radius: 4px; color: white; font-weight: 900; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        AAJ TAK
      </div>
    `;
  } else if (channelName.includes('NDTV')) {
    bug.innerHTML = `
      <div style="background: #DC2626; padding: 6px 12px; border-radius: 4px; color: white; font-weight: 900; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        NDTV INDIA
      </div>
    `;
  } else {
    bug.innerHTML = '';
  }
}
```

Call `updateChannelBug()` inside `loadDishVideo()` and `dishChangeChannel()`.

#### 6.3 — Blue button (SAP/language toggle) wiring

The DishTV remote has a blue button. Locate its `addSafeListener` binding (or add one if it doesn't exist).

```js
let subtitleMode = localStorage.getItem('samsung_subtitle_mode') || 'off';

function cycleSubtitleMode() {
  const modes = ['off', 'english', 'hindi'];
  const currentIdx = modes.indexOf(subtitleMode);
  subtitleMode = modes[(currentIdx + 1) % modes.length];
  localStorage.setItem('samsung_subtitle_mode', subtitleMode);
  updateSubtitleOverlay();

  const labels = { off: 'Subtitles OFF', english: 'Subtitles: English', hindi: 'Subtitles: हिंदी' };
  showToast(labels[subtitleMode], '<i class="fa-solid fa-closed-captioning"></i>', 'info');
}

function updateSubtitleOverlay() {
  let overlay = document.getElementById('subtitleOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'subtitleOverlay';
    overlay.style.cssText = 'position: absolute; bottom: 60px; left: 0; right: 0; text-align: center; color: white; background: rgba(0,0,0,0.7); padding: 4px 12px; font-size: 14px; z-index: 25; pointer-events: none;';
    document.getElementById('inputDishTV').appendChild(overlay);
  }
  if (subtitleMode === 'off') {
    overlay.style.display = 'none';
  } else if (subtitleMode === 'english') {
    overlay.style.display = 'block';
    overlay.textContent = '[English subtitles enabled — auto-translation]';
  } else {
    overlay.style.display = 'block';
    overlay.textContent = '[हिंदी उपशीर्षक सक्षम]';
  }
}
```

Bind to the blue button on the DishTV remote. Initialize state on `window.onload`.

**Acceptance:**
- ✅ Setup menu has "Retail Demo Mode" toggle; turning ON cycles inputs every 30s; floating banner appears
- ✅ DishTV channels show appropriate channel-logo bug in top-right corner
- ✅ Bug updates when changing channels
- ✅ Blue button on DishTV remote cycles through 3 subtitle states with toast feedback
- ✅ All settings persist across page reloads

---

### Phase 7 — Version bump + manifests (15 min)

After Phases 1-6 are verified working:

**1. `Samsung_TV.html` line ~1141:**
```diff
- let APP_VERSION = '1.0.24';
+ let APP_VERSION = '1.0.25';
```

**2. `version.json` (root):**
```json
{
  "version": "1.0.25",
  "release": "Gold Tier: About TV, Picture Test, AI badge + Why panel, 3 USB profiles, FS persistence, Demo Mode, channel bugs, blue button SAP"
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
    "version": "1.0.25",
    "app_version": "1.0.25",
    "release_notes": "v1.0.25 Gold Tier — 13 features across 6 categories. UI/UX/architecture polish, no new channels.",
    "size_kb": 12567,
    "required_min_version": "1.0.0",
    "signed_by": "DishTV-Samsung Partnership Certificate 2010"
  }
}
```

**4. Commit + push:**
```bash
git add -A
git commit -m "v1.0.25 Gold Tier: 13 features across 6 categories (no new channels)"
git push
```

---

## ⚙️ Technical Constraints

1. **No new external dependencies.** Only existing CDN libs (Tailwind, Font Awesome, hls.js).
2. **No build step.** Samsung simulator remains single static HTML + sibling JS files.
3. **No `package.json` in Samsung repo.**
4. **Preserve all existing functionality** — every existing feature must still work after v1.0.25.
5. **Test with `cache: 'no-store'`** on all manifest fetches.
6. **Idempotent code** — multiple loads / input switches / USB inserts must not produce duplicates or memory leaks.
7. **Mobile-aware** — new UI doesn't break existing layouts on mobile.
8. **Period-authentic styling** — use existing classes (`samsung-osd-bg`, `glass-panel`, `aero-font`); don't introduce new design languages.

---

## 🧪 Final Acceptance Test (run after Phase 7)

Walk through manually and verify each step:

1. **Power on TV.** APP_VERSION displays 1.0.25. ✅
2. **Switch to DishTV.** Channel 121 plays. Channel-up to 135. CH+ wraps to 121. ✅
3. **Channel names** all follow `Channel N: AajTak — [Show] ([Time])` format. ✅
4. **Menu → Support → About This TV.** Modal renders cleanly with v1.0.25 + today's date. ✅
5. **Menu → Support → Self Diagnosis → Picture Test.** Cycle through 4 patterns with arrows. ✅
6. **Press I → AI Channel Picker.** Type "halla bol." Result shows: channel + reason + provider badge (`⚡ groq · llama-3.3 · NNNms`). ✅
7. **Click "Why this channel?"** Panel shows top 5 candidates + LLM reasoning. ✅
8. **Open USB browser → cycle to MUSIC_USB.** Navigate `/music/`, click MP3 → audio player opens and plays. ✅
9. **Cycle to VACATION_USB.** Navigate `/DCIM/100SAMSUNG/`, click JPG → photo viewer with prev/next. ✅
10. **Cycle to OLDER_FW_USB.** Click `version.json` → downgrade warning prompt appears. ✅
11. **Any USB → create new file via editor → reload page.** New file persists. ✅
12. **Click "Reset USB to defaults"** → original profile content restored. ✅
13. **Menu → Setup → Retail Demo Mode → On.** Inputs auto-cycle every 30s + floating banners appear. Turn off. ✅
14. **Watch DishTV channel.** Channel bug visible in top-right corner; updates when changing channels. ✅
15. **Press blue button on DishTV remote.** Subtitle overlay toggles: off → English → Hindi → off. ✅
16. **Reload page entirely.** All settings (Demo Mode, subtitles, USB state, subtitle mode) persist. ✅
17. **Run `Check for Updates`** → "Up to date" at v1.0.25. All three OTA paths agree. ✅

If all 17 pass, v1.0.25 is ready to deploy.

---

## 🚀 Deployment Notes

1. Vercel auto-deploys on push. No manual trigger.
2. Test these live URLs after deploy:
   - `https://samsung-lcd-tv.vercel.app` — loads v1.0.25
   - `/version.json` — returns 1.0.25
   - `/usb-images/music.json` — 200 OK
   - `/usb-images/vacation.json` — 200 OK
   - `/usb-images/older-firmware.json` — 200 OK
3. No env var changes needed (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` are already configured).
4. Rollback: Vercel dashboard → Deployments → previous v1.0.24 → "Promote to Production" (60 seconds).

---

## 🧭 Design Philosophy

This is a **2010-era Samsung LCD TV simulator**. Every choice should pass: *"would this have felt right in 2010?"*

- ✅ About This TV, Picture Test, Closed Captions — real 2010 Samsung features
- ✅ Retail Demo Mode is **authentically obnoxious** — anyone who shopped for a TV recognizes it
- ✅ Channel logos/bugs are **standard broadcast practice** since 1990s
- ✅ Blue button SAP is **a real feature most viewers never used** — that's the point
- ⚠️ AI Picker badge + "Why?" panel are anachronistic but **on-brand** for the "2026 brain in 2010 chassis" theme

**Slow is okay.** Authentic detail beats velocity. The right small touch beats the flashy thing.

---

## 📞 If You Get Stuck

If anything is unclear:

1. Read `Samsung_TV.html` and `ai-picker.js` more carefully — most patterns are already established
2. Check the live deployment for current behavior
3. Ask the user (Aashman) a specific narrow question

The user prefers correctness over speed. Bluffing or pattern-matching from generic TV simulators will produce wrong results. Stay grounded in *this specific simulator's* existing code.

---

**End of master prompt for v1.0.25.** Begin with Phase 0. Report after each phase. After Phase 7, run the 17-step Acceptance Test and report results before declaring v1.0.25 ready to deploy.

**Next release after this: v1.0.26 (Silver Tier). Ask the user for a new OPENCODE_PROMPT.md when ready.**
