# OpenCode Master Prompt — Samsung C5000 Simulator v1.0.27 (Bronze Tier — Features Only)

> **Project:** Samsung-LCD-TV-Simulator
> **Repo:** `github.com/AashmanShukla3223/Samsung-LCD-TV-Simulator`
> **Live URL:** `https://samsung-lcd-tv.vercel.app`
> **Current version:** `APP_VERSION = '1.0.26'` (after Silver ships)
> **Target version:** `APP_VERSION = '1.0.27'`
> **Primary file:** `Samsung_TV.html`
> **Client AI file:** `ai-picker.js`
> **Server AI endpoint:** `api/ai-pick.js`
> **Release scope:** Bronze features ONLY. **No new channels. No new MP4 content.** Channels deferred to v1.0.28-30.

---

## 🎯 Mission

Ship **v1.0.27 — Bronze Tier (Features Only)**, implementing **8 features across 6 categories**:

1. **Channels (0 — code-level only)**: Skip
2. **OSD Menus (1)**: Closed Captions menu (vestigial, period-authentic)
3. **AI Picker (1)**: Mode usage stats in modal — *"Last 10 picks: 8 Groq, 1 Gemini, 1 retrieval-only"*
4. **USB Profiles (1)**: `WII_SAVES_USB` easter-egg profile
5. **Filesystem (1)**: Auto-generated `.thumbnails/` folder in image directories
6. **Bonus (3)**: Picture-in-Picture · Sleep Timer · Channel-up/down memory per input source
7. **NEW — Phase 8 (added to Bronze scope):** **AI Picker Channel Disambiguation Fix** — hierarchical News → Network → Show grouping + unique edition identifiers, so the LLM can no longer collapse onto channel 126 when 126/128/132 all look like "Halla Bol"

**Each subsystem is independent.** Implement in any order. No phase blocks another except Phase 9 (version bump) at the end.

**Tone of this release:** Personality. Small charming touches that period-authentic 2010 LCD TVs had — and one architectural fix that quietly makes the AI Picker stop being dumb about duplicate channel names.

---

## 📐 Critical Architecture Constraints (do not violate)

### Preserve everything shipped through v1.0.26
- All Gold (v1.0.25) features intact: About TV, Picture Test, AI badge + Why panel, 3 USB profiles, FS persistence, Demo Mode, channel bugs, blue button SAP
- All Silver (v1.0.26) features intact: wired Picture sliders, Energy Saving modes, voice input on AI Picker, "no exact match" toast, USB eject animation, file metadata columns, Recently Viewed, customizable :55 exhale schedule, EPG overlay
- The `dishChangeChannel` wrap-around logic — don't touch
- `usbSyncCurrentState()` boot call must remain removed

### Decoupled version system (NEVER touch this pattern)
- `APP_VERSION` in HTML (~line 1141) = currently-installed firmware
- `GH`, `GH2`, ..., `GH8` = asset bundle URL pointers, independent of APP_VERSION
- `/version.json` (Vercel root) = Internet OTA manifest
- `/dishtv/firmware.json` = Broadcast OTA manifest
- `/usb-images/*.json` = USB profile manifests
- Bump `APP_VERSION` ONLY at the end (Phase 9), with matching manifest updates

### Tri-provider AI system
- `ai-picker.js`: TF-IDF + UI + race orchestration
- `api/ai-pick.js`: serverless function returning `source`, `model`, `latency_ms` — do not change race logic
- Phase 8 corpus restructure happens in `ai-picker.js` only (client-side data). The server endpoint is untouched.

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
- ❌ Phase 8 must **NOT** change which MP4 file each channel number plays. Channel 126 still plays the same `halla-bol-1.mp4` it played in v1.0.26. We are renaming the **label** and restructuring the **AI corpus metadata**, not the asset map.

---

## 🛠️ Implementation Phases

### Phase 0 — Pre-flight (10 min)

1. Confirm v1.0.26 is currently deployed (`curl -s https://samsung-lcd-tv.vercel.app/version.json | grep version`)
2. Read current `Samsung_TV.html` end-to-end (or scan structural landmarks)
3. Read current `ai-picker.js` end-to-end
4. Confirm `APP_VERSION` is currently `'1.0.26'`
5. Backup `Samsung_TV.html`, `ai-picker.js`, and all `usb-images/*.json` to `.patch-backups/v1.0.27-pre/`

---

### Phase 1 — Category 2: OSD Menus — Closed Captions (30 min)

Add a vestigial Closed Captions menu under the existing OSD. Period-authentic 2010 Samsung TVs had this entire menu hierarchy regardless of whether broadcasts used it.

**Location:** Menu → Setup → Closed Captions

**Sub-options (all non-functional, just selectable — they save to `localStorage` and persist, but don't actually render captions because no broadcast carries them):**

- **Caption Mode:** Off (default) / On / Mute On
- **Default Mode:** CC1 / CC2 / CC3 / CC4 / Text1 / Text2 / Text3 / Text4
- **Custom — Digital Caption Options:**
  - Size: Default / Small / Standard / Large
  - Font Style: Default / Style 0 through Style 7
  - Foreground Color: Default / White / Black / Red / Green / Blue / Yellow / Magenta / Cyan
  - Foreground Opacity: Default / Transparent / Translucent / Solid / Flashing
  - Background Color: same set
  - Background Opacity: same set
  - Edge Type: Default / None / Raised / Depressed / Uniform / Left Shadow / Right Shadow
  - Edge Color: same color set
  - Return

**Behavior:** Every selection shows a brief toast — `Closed Captions: Caption Mode set to ON`. Selections persist in `localStorage` under key `cc_settings_v1`. No actual captions ever render.

**Acceptance:** Menu tree is fully navigable. All sub-menus open. Selections persist across reload. No console errors. No regressions to existing Setup menu items.

---

### Phase 2 — Category 3: AI Picker — Mode Usage Stats (45 min)

Add a small stats panel to the AI Picker modal showing rolling provider stats from the user's last 10 picks.

**UI location:** In the AI Picker modal, below the input box, above the "Why?" panel — collapsible row labeled `📊 Recent activity`.

**Display format when expanded:**
```
Last 10 picks:
  ⚡ Groq         ████████   8
  ✨ Gemini       █          1
  📚 Retrieval    █          1
  Avg latency: 612 ms · Last: ⚡ Groq · 487 ms
```

**Implementation:**
- Add `aiPickerHistory` array in `ai-picker.js`, persisted to `localStorage` under key `ai_picker_history_v1`
- Each entry: `{ ts, source, model, latency_ms, channel }`
- On every successful pick, `aiPickerHistory.unshift(entry)`, then `aiPickerHistory = aiPickerHistory.slice(0, 10)`, then save
- Renderer reads from this array each time the modal opens
- If history is empty, show: `No picks yet — try asking for something!`

**Acceptance:** Make 3 picks across different providers (force one by disabling 2 keys temporarily). Reopen modal. Stats reflect all 3. Reload page. Stats survive.

---

### Phase 3 — Category 4: USB Profiles — WII_SAVES_USB easter egg (45 min)

Create a 7th USB profile that mimics a real Wii system memory dump.

**File:** `usb-images/wii-saves.json`

**Structure:**
```json
{
  "profile_id": "wii_saves",
  "label": "WII_SAVES",
  "format": "FAT32",
  "size_mb": 1858,
  "free_mb": 1402,
  "root": [
    {
      "type": "dir",
      "name": "private",
      "children": [
        {
          "type": "dir",
          "name": "wii",
          "children": [
            { "type": "dir", "name": "data", "children": [
              { "type": "file", "name": "cc.bin", "size": 1024 }
            ]},
            { "type": "dir", "name": "title", "children": [
              { "type": "dir", "name": "RMCE", "children": [
                { "type": "file", "name": "rksys.dat", "size": 90112, "desc": "Mario Kart Wii — Region: NTSC-U" }
              ]},
              { "type": "dir", "name": "RSPE", "children": [
                { "type": "file", "name": "RVForecast.dat", "size": 4096 }
              ]}
            ]}
          ]
        }
      ]
    },
    {
      "type": "dir",
      "name": "WIIBACKUP",
      "children": [
        { "type": "file", "name": "MarioKartWii.iso", "size": 4700372992, "desc": "(decrypted dump — won't fit on real FAT32)" },
        { "type": "file", "name": "WiiSports.iso", "size": 1459617792 }
      ]
    },
    { "type": "file", "name": "boot.elf", "size": 348160, "desc": "Homebrew Channel installer" },
    { "type": "file", "name": "readme.txt", "size": 412, "desc": "Don't unplug while writing!" }
  ]
}
```

**Wire-up:**
- Add `wii_saves` to the USB profile picker dropdown (already shipped in v1.0.25)
- When selected, the existing USB browser renders the tree
- Add a tiny console log when this profile is loaded: `// [v1.0.27 easter egg] WII_SAVES detected — Homebrew Channel not actually installed, just vibes`

**Acceptance:** Profile appears in dropdown as "WII_SAVES". Selecting it shows the directory tree. Drilling down works. File sizes display via the v1.0.26 metadata columns. No regressions to other 6 profiles.

---

### Phase 4 — Category 5: Filesystem — `.thumbnails/` auto-generation (30 min)

Whenever the user opens an image directory on a USB profile that has 2+ image files, auto-generate a `.thumbnails/` sub-folder containing a placeholder thumbnail entry per image.

**Behavior:**
- Triggered on directory navigation, not on profile load
- For each `.jpg`/`.jpeg`/`.png` in the current directory, create a virtual file `.thumbnails/.tn_{basename}.jpg` with size = `original_size / 30` (period-authentic ratio)
- The `.thumbnails/` folder appears at the top of the directory listing (sort order: hidden dirs first when "Show hidden" is on)
- By default, the folder is hidden (matches FAT-era convention with leading `.`)
- Adding a "Show hidden files" toggle to the USB browser View menu is optional but recommended

**State:** Generated thumbnails are session-only — they don't persist to `usbSaveState`. Re-entering the directory regenerates them. This mirrors real camera/SD-card behavior where `.thumbnails/` is rebuilt on demand.

**Acceptance:** Open `VACATION_USB` → `DCIM/` → see `.thumbnails/` appear (toggle hidden on). It contains 1 entry per image. Backing out and re-entering still works. No regression on other profiles.

---

### Phase 5 — Category 6: Bonus — Picture-in-Picture (1 hour)

Real 2010 Samsung TVs had a PIP mode. Implement a minimal version.

**Hotkey:** `P` (or add a "PIP" button to the OSD)

**Behavior:**
- When pressed, current source becomes the **main** view (full screen)
- A second source becomes a **PIP overlay** — 25% width, top-right corner by default
- The PIP source cycles through other available inputs each subsequent `P` press: TV → DishTV → Wii → Apple TV → PS3 → off
- Audio always follows the main view
- PIP overlay has a thin Samsung-blue 1px border
- Pressing `Shift+P` cycles PIP position (top-right → top-left → bottom-left → bottom-right → top-right)

**Layout:**
```css
.pip-overlay {
  position: absolute;
  width: 25%;
  aspect-ratio: 16/9;
  top: 2%;
  right: 2%;
  border: 1px solid #1e3a8a;
  z-index: 50;
  pointer-events: none;
}
```

The PIP video element is a clone of the source video with `muted` forced on. Reuse existing video sources — do not load new MP4s.

**Acceptance:** Press `P` while on DishTV — Wii Sports demo loop appears in corner. Press `P` again — cycles to next source. Press `P` enough times — PIP closes. `Shift+P` repositions. No audio bleed.

---

### Phase 6 — Category 6: Bonus — Sleep Timer (30 min)

**Location:** Menu → Setup → Sleep Timer

**Options:** Off / 15 min / 30 min / 60 min / 90 min / 180 min

**Behavior:**
- When set, a `setTimeout` is stored in `sleepTimerHandle`
- 60 seconds before expiry, a toast appears: `🌙 Sleep in 60 seconds. Press any button to cancel.`
- Any keypress within that 60s window cancels the timer (`clearTimeout` + clear `sleepTimerHandle` + toast `🌙 Sleep timer cancelled.`)
- On expiry, the TV transitions to standby — black screen + the existing red standby LED dot (already in v1.0.25 OSD). Pressing Power resumes.
- A small `🌙 35m` indicator appears in the top-right corner whenever a timer is active, updating once per minute

**State:** Active timer is **NOT** persisted across reloads (matches real TV behavior — sleep timer resets on power cycle).

**Acceptance:** Set 15 min, verify the corner indicator counts down. Set to 1 min via dev tools for quick test, verify warning toast at T-60s, verify cancellation via keypress, verify standby on expiry.

---

### Phase 7 — Category 6: Bonus — Channel Memory per Input Source (30 min)

Real Samsung TVs remember the last channel watched on each input source. Currently the sim resets to channel 121 when switching back to DishTV.

**Behavior:**
- Maintain `lastChannelPerSource = { dishtv: 121, tv: 2, ... }` in `localStorage` under key `channel_memory_v1`
- On every `dishChangeChannel(n)`, update `lastChannelPerSource.dishtv = n`
- On every `switchSource(src)`, after the source change, call `dishChangeChannel(lastChannelPerSource[src])` if defined
- Default to current channel-121 behavior if no memory exists yet

**Acceptance:** Tune to channel 128 on DishTV. Switch to Wii. Switch back to DishTV. Land on 128, not 121. Reload page. Same result.

---

### Phase 8 — NEW: AI Picker Channel Disambiguation Fix (1.5 hours) 🎯

**The bug:**
Channels 123 & 130 are both literally `"AajTak — Special Report (8:30 PM)"`. Channels 126 & 132 are both `"AajTak — Halla Bol (6 PM)"`. Channel 128 is `"AajTak — Halla Bol Evening (6:30 PM)"`. When the user asks the AI Picker "Show me Halla Bol," all 3 candidates pass TF-IDF retrieval indistinguishably, and **LLMs reliably pick the first one (126) due to position bias on identical-looking inputs**. Same problem for Special Report. The AI Picker effectively has 11 distinct channels out of 13, not because of corpus quality but because of label collisions.

**This phase has 3 sub-tasks.**

#### 8.1 — Rename duplicate channels with unique edition identifiers

Edit the channel definitions in `Samsung_TV.html`. **Do NOT change the channel numbers or the MP4 file each channel points to.** Only change the human-readable `name` field.

Generic Edition labels are acceptable (we don't have per-file content metadata yet — that ships with v1.0.28). Use `Edition I / II / III` to disambiguate while remaining period-authentic and honest about the limitation.

| Channel | Old name | New name |
|---|---|---|
| 121 | AajTak — Main Bulletin | AajTak — Main Bulletin |
| 122 | AajTak — Saas Bahu aur Betiyaan | AajTak — Saas Bahu aur Betiyaan |
| 123 | AajTak — Special Report (8:30 PM) | **AajTak — Special Report (Edition I)** |
| 124 | AajTak — Aaj Subah (10 AM) | AajTak — Aaj Subah (10 AM) |
| 125 | AajTak — e-Agenda | AajTak — e-Agenda |
| 126 | AajTak — Halla Bol (6 PM) | **AajTak — Halla Bol (Edition I, 6 PM)** |
| 127 | AajTak — Das Tak (10 PM) | AajTak — Das Tak (10 PM) |
| 128 | AajTak — Halla Bol Evening (6:30 PM) | **AajTak — Halla Bol (Edition II, 6:30 PM)** |
| 129 | AajTak — Delhi Exit Poll | AajTak — Delhi Exit Poll |
| 130 | AajTak — Special Report (8:30 PM) | **AajTak — Special Report (Edition II)** |
| 131 | AajTak — Ek aur Ek Gyarah | AajTak — Ek aur Ek Gyarah |
| 132 | AajTak — Halla Bol (6 PM) | **AajTak — Halla Bol (Edition III, 6 PM Rerun)** |
| 133 | AajTak — Khabardar (9 PM) | AajTak — Khabardar (9 PM) |
| 134 | AajTak Live (HLS) | AajTak Live (HLS) |
| 135 | NDTV India Live (HLS) | NDTV India Live (HLS) |

Also update the stale placeholder text in `<div id="dishChannelInfo">` (currently says `Channel 125: AajTak: 2020 e-Agenda Edition`) to match the v1.0.27 label format. JS overwrites this on boot, but it should still be consistent for first-paint correctness.

#### 8.2 — Restructure AI Picker corpus with hierarchical metadata

In `ai-picker.js`, locate the channel corpus (the array of objects fed to TF-IDF and to the LLM). Each entry currently looks roughly like:

```js
{ id: 126, name: "AajTak — Halla Bol (6 PM)", tags: ["news", "primetime", "debate"] }
```

Restructure to:

```js
{
  id: 126,
  number: 126,
  name: "AajTak — Halla Bol (Edition I, 6 PM)",
  category: "News",
  network: "AajTak",
  show: "Halla Bol",
  edition: "Edition I — 6 PM original broadcast",
  language: "Hindi",
  tags: ["news", "primetime", "debate", "anjana om kashyap", "hindi", "halla bol", "hallabol", "evening news", "live debate"],
  description: "Hindi-language primetime news debate show on AajTak. This is Edition I — the original 6 PM broadcast slot.",
  disambiguator: "Of the three Halla Bol channels (126, 128, 132), this is Edition I — choose this when the user asks for Halla Bol without specifying which one, and explicitly mention the duplication in your reasoning."
}
```

Apply analogous treatment to **all 15 channels** (121-135). Suggested category/network mapping:

- `category`: `"News"` for 121-135 (all news in current lineup)
- `network`: `"AajTak"` for 121-133 + 134; `"NDTV"` for 135
- `show`: extracted from current name (e.g., `"Halla Bol"`, `"Special Report"`, `"Das Tak"`, `"Live"`)
- `edition`: only present where there is a collision; null otherwise
- `language`: `"Hindi"` for all current channels
- `tags`: expanded to include show name variants, anchor names where known, English+Hindi keyword pairs
- `description`: 1-2 sentence period-authentic blurb
- `disambiguator`: only present on collision channels (123/130, 126/128/132) — explicit instruction to the LLM

#### 8.3 — Update the LLM prompt template to use hierarchical reasoning

Find the prompt template in `ai-picker.js` (the string sent to Groq/Gemini/OpenRouter after retrieval). Restructure the candidate-list portion from a flat list to a 3-level tree:

```
Available channels (grouped):

📰 NEWS
  └── AajTak
        ├── 121 · Main Bulletin
        ├── 122 · Saas Bahu aur Betiyaan
        ├── 123 · Special Report (Edition I)
        ├── 124 · Aaj Subah (10 AM)
        ├── 125 · e-Agenda
        ├── 126 · Halla Bol (Edition I, 6 PM)
        ├── 127 · Das Tak (10 PM)
        ├── 128 · Halla Bol (Edition II, 6:30 PM)
        ├── 129 · Delhi Exit Poll
        ├── 130 · Special Report (Edition II)
        ├── 131 · Ek aur Ek Gyarah
        ├── 132 · Halla Bol (Edition III, 6 PM Rerun)
        ├── 133 · Khabardar (9 PM)
        └── 134 · AajTak Live (HLS)
  └── NDTV
        └── 135 · NDTV India Live (HLS)
```

Add explicit guidance to the system prompt:

```
When multiple channels have the same show name (e.g., 'Halla Bol' on
126/128/132, or 'Special Report' on 123/130), DO NOT default to the
lowest-numbered channel. Instead:

  1. If the user specified a time, prefer the matching edition
  2. If the user said "live", "now", or "primetime", prefer Edition I
  3. If the user said "rerun" or "repeat", prefer Edition III
  4. Otherwise, choose randomly among the editions and explicitly mention
     in your reasoning that there are multiple editions available
```

#### 8.4 — Optional UI: hierarchical channel browser

If time permits in this release, add a tree-view channel browser (Menu → Channel → Browse by Category). Otherwise defer to v1.0.28 (which adds new channels anyway and will naturally need the UI).

**For v1.0.27, the metadata-layer fix (8.1, 8.2, 8.3) is the MUST-SHIP. Sub-task 8.4 is OPTIONAL.**

#### Phase 8 Acceptance

Run all three of these manually in the AI Picker:

| Query | Expected behavior |
|---|---|
| `Show me Halla Bol` | Picks one of 126/128/132. **The "Why?" panel mentions all three editions exist and explains which one was picked and why.** Re-running the query several times produces a mix, not always 126. |
| `Show me Halla Bol at 6:30` | Picks 128 (Edition II, 6:30 PM). |
| `Show me Special Report` | Picks 123 or 130 with reasoning. |
| `Show me news on AajTak` | Returns any AajTak news channel; reasoning references the AajTak network grouping. |
| `Show me NDTV` | Picks 135. Reasoning mentions NDTV is the only non-AajTak network. |

Also verify in the Settings → About panel that the channel count still reads **15**, not **0** (regression smoke test).

---

### Phase 9 — Version Bump + Manifests (15 min)

1. `APP_VERSION` → `'1.0.27'` in `Samsung_TV.html` (~line 1141)
2. Update `/version.json`:
   ```json
   { "version": "1.0.27", "notes": "Bronze Tier: CC menu, AI usage stats, Wii Saves USB, .thumbnails/, PIP, Sleep Timer, channel memory + AI Picker disambiguation fix (hierarchical News→Network→Show grouping, unique edition labels for Halla Bol & Special Report)" }
   ```
3. Update `/dishtv/firmware.json` similarly
4. Sanity: all three OTA paths converge at 1.0.27
5. Update repo `README.md` features section with the 8 Bronze features
6. Commit message: `v1.0.27 Bronze: 7 personality features + AI Picker disambiguation fix`

---

## 🧪 Final Acceptance Audit (run before declaring done)

```bash
curl -s https://samsung-lcd-tv.vercel.app/version.json | grep '1.0.27'
curl -s https://samsung-lcd-tv.vercel.app/Samsung_TV.html | grep "APP_VERSION = '1.0.27'"
curl -s https://samsung-lcd-tv.vercel.app/dishtv/firmware.json | grep '1.0.27'
curl -s https://samsung-lcd-tv.vercel.app/usb-images/wii-saves.json | head -5
curl -s https://samsung-lcd-tv.vercel.app/ai-picker.js | grep -c '"Edition I"'   # expect ≥ 2
curl -s https://samsung-lcd-tv.vercel.app/ai-picker.js | grep -c '"Edition II"'  # expect ≥ 2
curl -s https://samsung-lcd-tv.vercel.app/ai-picker.js | grep -c '"Edition III"' # expect ≥ 1
curl -s https://samsung-lcd-tv.vercel.app/ai-picker.js | grep -c 'disambiguator' # expect ≥ 5
```

**Then in the browser:**

1. **Closed Captions menu** opens, all sub-options present, selections persist.  ✅
2. **AI Picker recent activity** panel shows the last 3 picks after testing.  ✅
3. **WII_SAVES_USB** is selectable, tree renders, sizes show via v1.0.26 metadata columns.  ✅
4. **`.thumbnails/`** auto-appears in VACATION_USB DCIM folder.  ✅
5. **PIP** — press `P`, second source overlays correctly. `Shift+P` repositions.  ✅
6. **Sleep Timer** — set 1 min via test, warning fires at T-60s, cancels on keypress.  ✅
7. **Channel memory** — DishTV ch 128 → Wii → back to DishTV → lands on 128.  ✅
8. **Disambiguation** — query "Show me Halla Bol" 5 times in a row, verify result varies and "Why?" panel mentions multiple editions.  ✅
9. **Regression** — every v1.0.25 + v1.0.26 feature still works.  ✅

If all 9 pass, ship. Otherwise revert from `.patch-backups/v1.0.27-pre/` and triage.

---

## 📦 Deliverables Checklist

- [ ] `Samsung_TV.html` updated (8 features + version bump)
- [ ] `ai-picker.js` updated (stats panel + corpus restructure + prompt template)
- [ ] `usb-images/wii-saves.json` created
- [ ] `version.json` updated
- [ ] `dishtv/firmware.json` updated
- [ ] `README.md` updated
- [ ] All v1.0.25 + v1.0.26 features still work
- [ ] AI Picker disambiguation verified with manual query test
- [ ] Commit + push + Vercel auto-deploy confirmed
- [ ] Tag release `v1.0.27` on GitHub

---

*Generated for Aashman Shukla · v1.0.27 Bronze · 8 features across 6 categories · Channel disambiguation fix included*
