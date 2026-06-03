# 🛣️ Samsung C5000 Simulator — Release Roadmap (v1.0.25 → v1.0.30)

> **Strategy:** Six focused releases. Features first, content last. Each release is small enough to complete in one OpenCode session.
> **Why split:** Decoupled feature work from content sourcing. Each release ships independently. Battery-friendly session scope.

---

## 📊 Release Overview

| Version | Theme | Type | Scope |
|---|---|---|---|
| **v1.0.25** | The Gold Polish | Features only | 13 high-impact UI/UX/architecture features across 6 categories |
| **v1.0.26** | The Silver Refinement | Features only | 9 medium-impact refinements |
| **v1.0.27** | The Bronze Personality | Features only | 7 small charming features |
| **v1.0.28** | News Content Expansion | Channels only | 3 AajTak MP4s + 1 HLS stream (India Today archive 2020) |
| **v1.0.29** | Kids Imports | Channels only | 2× Peppa Pig + 2× Paw Patrol (Hindi dubs) |
| **v1.0.30** | Kids Indian Originals | Channels only | 2× Chikoo Aur Bunty + 2× Motu Patlu |

**Total across arc:** 29 features + 12 channels = 41 distinct shippable items, 6 release cycles.

---

## 🥇 v1.0.25 — The Gold Polish Release

**Scope:** Pure feature work, no new channels. The UI/UX/architecture quality upgrade.

### Features (13 across 6 categories):

**Channels (3 — code-level only, no new content):**
- Rename existing channels for consistent grid format (`Channel N: AajTak — [Show] ([Time])`)
- Add CH+/CH- wrap-around behavior at first/last channel
- *(Note: Channel ADDITIONS deferred to v1.0.28-30. This release only refactors existing channel data.)*

**OSD Menus (2):**
- About This TV panel (Support menu) — shows model, firmware, region, asset CDN
- Picture Test in Self-Diagnosis — SMPTE color bars, grayscale, solid colors, motion pattern

**AI Picker (2):**
- Provider + latency badge in result UI (`⚡ Groq · 487ms`)
- "Why this channel?" expandable panel showing TF-IDF candidates + LLM reasoning

**USB Profiles (3):**
- MUSIC_USB profile with sound test tracks + tiny media player overlay
- VACATION_USB profile with sample JPGs + photo viewer
- OLDER_FIRMWARE_USB profile that triggers downgrade warning

**Filesystem (1):**
- Persist user-added files to localStorage across page reloads

**Bonus (3):**
- Retail Demo Mode toggle in Setup (auto-cycles inputs every 30s)
- Channel logos/bugs overlay on DishTV channels (AajTak red/yellow, NDTV red/white)
- Blue button (SAP/language toggle) wiring — toggles subtitle overlay through 3 states

**Acceptance:** All 13 gold features verified working. APP_VERSION bumped to 1.0.25. All three OTA paths converge at 1.0.25.

**Post-release:** PLAYBOOK.md Phase 1 — submit to HN, post on LinkedIn, share to r/developersIndia, Twitter thread.

---

## 🥈 v1.0.26 — The Silver Refinement Release

**Scope:** 9 medium-impact features. Polish over novelty.

### Features (9 across 6 categories):

**Channels (1):**
- Add 1 non-AajTak Indian news channel — pick when content is sourced
  *(slated for the news-content release v1.0.28; if you want it earlier, move here)*

**OSD Menus (2):**
- Wire 2-3 Picture menu sliders to actually affect the video (Brightness via CSS filter, Color via saturate, Eco Mode)
- Energy Saving modes in Picture menu (Off/Low/Med/High/Auto) — each progressively dims via brightness CSS

**AI Picker (2):**
- Voice input via Web Speech API (mic button → speech-to-text → existing AI flow)
- "No exact match" friendly message when AI confidence is low

**USB Profiles (1):**
- USB Eject animation + soft eject sound when disconnecting

**Filesystem (2):**
- File metadata: size, modified date, type-icon (📁 📄 🎵 🖼️ 📦) in the file browser
- "Recently Viewed" auto-populated pseudo-folder in any USB profile

**Bonus (1):**
- Customizable :55 exhale schedule (Every Hour / Once Daily / OFF) in Setup
- EPG (Electronic Program Guide) overlay — press a button → see today's schedule table

**Acceptance:** All 9 silver features verified. APP_VERSION → 1.0.26.

**Post-release:** PLAYBOOK.md Phase 2 — long-form blog post on dev.to, submit to awesome-lists.

---

## 🥉 v1.0.27 — The Bronze Personality Release

**Scope:** 7 small charming features that add personality without being essential.

### Features (7):

**OSD Menus (1):**
- Closed Captions menu (vestigial / non-functional, but exists as a UI surface — period-authentic)

**AI Picker (1):**
- Mode usage stats in modal — "Last 10 picks: 8 Groq, 1 Gemini, 1 retrieval-only"

**USB Profiles (1):**
- WII_SAVES_USB profile (easter egg) — mimics Wii save data folder structure

**Filesystem (1):**
- Auto-generated `.thumbnails/` folder in image directories (cute, like real cameras)

**Bonus (3):**
- Picture-in-Picture mode — show one source as main + small overlay window with another
- Sleep timer — "Sleep in 15/30/60/90 minutes"
- Channel-up/down memory — TV remembers last channel per input source

**Acceptance:** All 7 bronze features verified. APP_VERSION → 1.0.27.

**Post-release:** PLAYBOOK.md Phase 2 continued — Indie Hackers submission, Product Hunt prep.

---

## 📡 v1.0.28 — News Content Expansion

**Scope:** 4 new channels in the news category. All content-only, no new code features.

### Channels (4):

| Channel | Source | Type | Notes |
|---|---|---|---|
| **Channel 136: AajTak — Dangal (5 PM)** | `dishtv_source14.mp4` (GH9 = v1.0.8 release) | MP4 | Chitra Tripathi's loud-debate slot |
| **Channel 137: AajTak — Desh Tak (7 PM)** | `dishtv_source15.mp4` (GH9) | MP4 | Hindi-belt regional politics |
| **Channel 200: India Today (2020 Archive, 11 AM)** | `dishtv_source16.mp4` (GH9) | MP4 | English news, sibling brand to AajTak |
| **Channel 201: 1 HLS Stream** | TBD live HLS URL | Live | Pick when you've identified a working source |

### Implementation tasks:

- Upload 3 MP4s to a new GitHub Release tag `v1.0.8`
- Add `const GH9 = 'releases/download/v1.0.8/';` constant in `Samsung_TV.html`
- Add the 4 channel entries to `dishChannels` array
- Update the AI Picker corpus (`META` object in `ai-picker.js`) to include the new channels with appropriate tags
- Update channel-logos/bugs overlay to handle India Today branding (blue/orange bug for India Today)

**Acceptance:** All 4 channels play correctly. AI Picker can find them via natural-language queries. APP_VERSION → 1.0.28.

**Post-release:** Brief LinkedIn post focused on the new news lineup.

---

## 🐷 v1.0.29 — Kids Imports Release

**Scope:** 4 new channels in the kids category. Western imports in Hindi dub.

### Channels (4):

| Channel | Source | Notes |
|---|---|---|
| **Channel 500: Peppa Pig — Episode 1 (Hindi dub)** | `peppa_01.mp4` (GH10 = v1.0.9 release) | Pick a recognizable episode (Muddy Puddles classic) |
| **Channel 501: Peppa Pig — Episode 2 (Hindi dub)** | `peppa_02.mp4` (GH10) | Pick a George/dinosaur episode for variety |
| **Channel 502: Paw Patrol — Episode 1 (Hindi dub)** | `paw_patrol_01.mp4` (GH10) | Chase-rescue or Marshall episode |
| **Channel 503: Paw Patrol — Episode 2 (Hindi dub)** | `paw_patrol_02.mp4` (GH10) | Different pup focus for variety |

### Implementation tasks:

- Upload 4 MP4s to GitHub Release tag `v1.0.9`
- Add `const GH10 = 'releases/download/v1.0.9/';` constant
- Add 4 channel entries with kids-category metadata
- Update AI Picker corpus with kids tags ("kids", "preschool", "peppa", "paw patrol", "hindi dub")
- Add channel logos for Nick Jr (where Peppa & Paw Patrol broadcast)
- Test on smaller screens — kids' content viewers might be using tablets

**Acceptance:** All 4 channels play correctly. AI Picker handles queries like "show me peppa" or "kids show". APP_VERSION → 1.0.29.

**Post-release:** Tweet thread highlighting the "this simulator now spans household audiences" angle.

---

## 🎈 v1.0.30 — Kids Indian Originals Release

**Scope:** 4 new channels in the kids category. Hindi-original content.

### Channels (4):

| Channel | Source | Notes |
|---|---|---|
| **Channel 504: Chikoo Aur Bunty — Episode 1** | `chikoo_01.mp4` (GH11 = v1.0.10 release) | Hindi-original animation |
| **Channel 505: Chikoo Aur Bunty — Episode 2** | `chikoo_02.mp4` (GH11) | Different storyline |
| **Channel 506: Motu Patlu — Episode 1** | `motu_01.mp4` (GH11) | Hindi-original; possibly the most-watched Indian kids' show |
| **Channel 507: Motu Patlu — Episode 2** | `motu_02.mp4` (GH11) | Different episode |

### Implementation tasks:

- Upload 4 MP4s to GitHub Release tag `v1.0.10`
- Add `const GH11 = 'releases/download/v1.0.10/';` constant
- Add 4 channel entries
- Update AI Picker corpus with Indian-original kids tags
- Add channel logos for Nick India (where Motu Patlu and Chikoo broadcast)

**Acceptance:** All 4 channels play correctly. Total simulator now has 19 AajTak + 1 India Today + 1 HLS + 8 kids' = ~29 DishTV channels. APP_VERSION → 1.0.30.

**Post-release:** Long-form blog post — "Why I added Indian-original kids' content alongside Peppa Pig in my TV simulator." Cultural angle resonates with Indian dev community.

---

## 🎯 Final State (after v1.0.30)

```
Samsung C5000 Simulator — v1.0.30 Channel Lineup
══════════════════════════════════════════════════
NEWS:
  Channel 121-133: AajTak existing (13)
  Channel 134: AajTak Live (HLS)
  Channel 135: NDTV India Live (HLS)
  Channel 136: AajTak — Dangal (5 PM)        [v1.0.28]
  Channel 137: AajTak — Desh Tak (7 PM)      [v1.0.28]
  Channel 200: India Today (2020 archive)    [v1.0.28]
  Channel 201: [TBD HLS stream]              [v1.0.28]

KIDS:
  Channel 500-501: Peppa Pig (Hindi)         [v1.0.29]
  Channel 502-503: Paw Patrol (Hindi)        [v1.0.29]
  Channel 504-505: Chikoo Aur Bunty          [v1.0.30]
  Channel 506-507: Motu Patlu                [v1.0.30]

OTHER INPUTS (unchanged):
  TV/RF, AV/Wii, HDMI 1 (AppleTV), HDMI 2 (PS3)
══════════════════════════════════════════════════
Total: ~29 DishTV channels + 4 alternate input surfaces
```

---

## 📋 Per-Release Workflow

For each release v1.0.25 → v1.0.30:

1. **Read the current `OPENCODE_PROMPT.md`** (always reflects the current release's scope)
2. **Feed it to OpenCode** with all architecture constraints respected
3. **Run the per-release acceptance test** at the end
4. **Bump version + commit + push**
5. **Verify all 3 OTA paths converge** at the new version
6. **Wait for Vercel auto-deploy** (~30 seconds)
7. **(Optional) Execute the post-release discovery action** from PLAYBOOK.md
8. **Ask for the next OPENCODE_PROMPT.md** — I'll regenerate it for the next release

---

## 🛑 What NOT to do during this arc

- ❌ Don't combine releases (each one stays focused)
- ❌ Don't ship content (v1.0.28-30) before features (v1.0.25-27) — content benefits from features
- ❌ Don't add features outside the scoped category list — defer to a later release
- ❌ Don't skip the acceptance test — each release is small enough to test thoroughly
- ❌ Don't force-push or rewrite git history during the arc
- ❌ Don't try to push if Vercel deployment-protection flags the commit (verify Git author first)

---

## 🎯 When the arc is done (after v1.0.30)

- 6 versions shipped across 2-4 weeks
- ~12 new channels added
- ~29 new features added
- Each release individually deployable
- PLAYBOOK.md Phase 3 (sustained discovery habits) kicks in
- Optionally, decide whether to start a v1.1.x arc with more ambitious work (real FAT32, regional language toggle, etc.)
