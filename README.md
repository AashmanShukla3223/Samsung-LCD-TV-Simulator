# 📺 Samsung C5000 LCD TV Simulator
### **A period-authentic 2010 LCD TV, rebuilt with a 2026 firmware brain.**

[![Live Site: samsung-lcd-tv.vercel.app](https://img.shields.io/badge/Live-samsung--lcd--tv.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://samsung-lcd-tv.vercel.app)
[![Version: v1.0.20](https://img.shields.io/badge/Version-v1.0.20-amber?style=for-the-badge)](https://samsung-lcd-tv.vercel.app/version.json)
[![Engine: OpenCode CLI Vibecoded](https://img.shields.io/badge/Engine-OpenCode%20CLI%20Vibecoded-purple?style=for-the-badge)](https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills)
[![AI: Gemini 3.1 Flash Lite](https://img.shields.io/badge/AI-Gemini%203.1%20Flash%20Lite-blue?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Era: 2010 Samsung BN59](https://img.shields.io/badge/Era-2010%20Samsung%20BN59-zinc?style=for-the-badge)](https://samsung-lcd-tv.vercel.app)

---

## 🎯 THE PITCH
A faithful recreation of a **Samsung C5000 / BN59-series LCD TV from 2010**, deployed at [`samsung-lcd-tv.vercel.app`](https://samsung-lcd-tv.vercel.app). Five inputs, five remotes, real live news streams, a real firmware OTA system, and a natural-language AI channel picker — built end-to-end in **5 days** with `Antigravity and OpenCode CLI Prompts and Skills`.

This is what happens when **bounded-broadcast 2010 hardware** meets **2026 AI tooling**: every layer of the chassis was rebuilt for *the way TV used to work* — scheduled programs, ad breaks at fixed times, the SAP language toggle nobody pressed, the firmware that updated overnight — and then layered with the OTA infrastructure and AI brain that *the era never had but probably should have*.

---

## 🏆 WHAT MAKES IT WORK

### ⚡ Three-Path OTA Firmware Update System
Not one update method — **three**, mirroring real consumer-electronics history:

| Path | Mechanism | Manifest |
|------|-----------|----------|
| 🌐 **Internet** | Manual `Check for Updates` → fetches remote manifest | [`/version.json`](https://samsung-lcd-tv.vercel.app/version.json) |
| 💾 **USB** | Insert virtual USB → file browser → install from `version.json` inside | [`/usb-images/*.json`](https://samsung-lcd-tv.vercel.app/usb-images/normal.json) |
| 📡 **Broadcast** | Passive scanner when DishTV input is active → reception progress bar → install | [`/dishtv/firmware.json`](https://samsung-lcd-tv.vercel.app/dishtv/firmware.json) |

All three converge at the same `showUpdateOverlay()` install flow. Cross-method **conflict resolver** when two paths offer different versions. **Four USB profiles** (normal / empty / corrupted / multi-firmware) for testing every error path. Period-authentic "Update in 3 seconds…" reboot animation.

### 🧠 RAG-Powered AI Channel Picker (`ai-picker.js`)
A **fully client-side RAG pipeline**, ~650 lines of vanilla JS:
- **TF-IDF retrieval** over a 14-channel DishTV metadata corpus (bilingual EN/HI tags)
- **Gemini 3.1 Flash Lite** for final channel selection with one-sentence reason (in the user's language)
- **Retrieval-only fallback** when no API key configured — graceful degradation
- **No backend** — API key lives in `localStorage`, prompt fires direct from browser
- Floating AI button + `I` hotkey + bilingual prompt UI

The Gemini prompt is in-universe: *"You are the AI inside a Samsung C5000 LCD TV connected via HDMI 3 to a DishTV set-top box…"* — the AI thinks it's part of the TV's firmware.

### 🕰️ AajTak `:55` Hourly Exhale Window
At the `:55` mark of every real-time hour, while the TV is on, a soft overlay fades in:

```
🌬️  AajTak: Exhale
    Take a deep breath. The news can wait.
    Auto-dismiss in 60s
```

Plays a 220 Hz parasympathetic tone for 0.8s — engineered breath-cycle audio matching the actual transitional moments of Indian primetime news broadcasts. **The simulator becomes accidentally meditative once an hour, by design.**

### 📡 Real Live HLS Streams + Curated AajTak MP4 Clips
- **Channel 134** — AajTak Live (HLS via `feeds.intoday.in`)
- **Channel 135** — NDTV India Live (HLS via Akamai)
- **Channels 121–133** — Curated AajTak content (`Khabardar Edition` and others) hosted on GitHub Releases

### 💾 Decoupled Asset CDN Architecture
The whole reason the simulator ships real video content: **GitHub Releases as a free, versioned binary CDN** to escape Vercel's 100 MB deployment-size limit.

```js
const GH  = '.../releases/download/v1.0/';      // genesis asset bundle
const GH2 = '.../releases/download/v1.0.1/';
const GH3 = '.../releases/download/v1.0.2/';
...
const GH8 = '.../releases/download/v1.0.7/';    // Khabardar Channel 133
```

`APP_VERSION` (the firmware version users see) is **decoupled** from the asset-bundle release tags. Bumping content doesn't force a fake firmware bump.

---

## 📂 PROJECT STRUCTURE

```
Samsung-lcd-tv/
├── Samsung_TV.html          # 4,225 lines vanilla HTML/CSS/JS. The whole simulator.
├── ai-picker.js             # 650 lines. RAG pipeline + Gemini integration.
├── index.html               # Root landing page → meta-refresh to Samsung_TV.html
├── version.json             # Internet OTA manifest
├── dishtv/
│   └── firmware.json        # Broadcast OTA manifest
└── usb-images/
    ├── normal.json          # Standard SanDisk USB with current firmware
    ├── empty.json           # Freshly-formatted USB, no firmware
    ├── corrupted.json       # Malformed version.json, tests error path
    └── multi-firmware.json  # USB with 3 firmware candidates (root/beta/stable)
```

---

## 🎨 INPUTS & CHASSIS

Five inputs, five distinct UI worlds, five swappable remotes — the remote bay morphs based on the active input source:

| Source | Input | Surface |
|--------|-------|---------|
| **TV / RF** | Built-in tuner | CRT static + "No Signal" widget |
| **AV / Component** | HDMI 0 | **Nintendo Wii Menu** (Disc / Mii / Photo / Shop / Forecast channels) |
| **HDMI 1** | Apple TV HD | **tvOS 26 Insider** with Siri 2026 |
| **HDMI 2** | PS3 | **XMB cross-media bar** with animated wave background |
| **HDMI 3** | DishTV STB | **15 channels** of AajTak content + live HLS news |

Plus the full Samsung OSD: Picture / Sound / Input / Setup / Support, with a **Self Diagnosis → Sound Test** that plays four tracks (system soundtest, AajTak signature, Batidão da Madrugada Speed Edit, Halla Bol theme).

---

## 🚀 LIVE DEPLOYMENT

**Primary:** [`samsung-lcd-tv.vercel.app`](https://samsung-lcd-tv.vercel.app)
**Legacy alias:** [`project-78d0r.vercel.app`](https://project-78d0r.vercel.app) → 307 redirect to primary
**Hosting:** Vercel (static)
**Asset CDN:** GitHub Releases (this repo, `v1.0` through `v1.0.7` tags)
**Build step:** none — single static HTML file + sibling JS

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `P` | Power |
| `M` | Menu |
| `S` | Source list |
| `0` / `Shift+M` | Mute |
| `+` / `-` | Volume |
| `↑ ↓ ← →` | Navigate menus / Wii / PS3 |
| `Enter` | Confirm |
| `Esc` / `Backspace` | Back / Close |
| `I` | Open AI Channel Picker |
| `F1` | Toggle this help |

---

## 📅 BUILD TIMELINE

| Day | Phase | Outcome |
|-----|-------|---------|
| 1 | Chassis + first 6 DishTV channels (121–126) | First Vercel deploy ≈ `v0.0.85`. Only 2 channels survive the 100MB limit. |
| 2 | Discover `yt-dlp --download-sections` | Computer stops frying. 10 more channels become possible. |
| 2–3 | Migrate to GitHub Releases as CDN | `GH` constants pattern emerges. Reach `v1.0.5`. |
| 3 | Multi-path OTA system (Internet + USB + Broadcast) | `v1.0.6 → v1.0.11`. +840 lines. |
| 3 | AajTak `:55` exhale + channel pack delivery | `v1.0.11`. The atmospheric feature lands. |
| 4 | RAG-powered AI Channel Picker | `v1.0.13`. +30 KB `ai-picker.js`. |
| 5 | Model swap to Gemini 3.1 Flash Lite | `v1.0.15 → v1.0.16` (caught a release-notes-vs-code discrepancy in between). |
| 5 | First real MP4 content ship (Khabardar Channel 133) | `v1.0.20`. The infrastructure finally carries cargo. |
| 5 | Custom domain + override-scare recovery | `samsung-lcd-tv.vercel.app` becomes canonical. |

**Net:** ~95 KB of code shipped across 20 releases in 5 days. Zero unrecovered bugs. Three-path OTA convergent at `v1.0.20`.

---

## 🛠️ BUILD STACK

| Layer | Tool |
|-------|------|
| **Markup + Layout** | Vanilla HTML + Tailwind CSS (via CDN) |
| **Logic** | Vanilla JS (no framework, no build step) |
| **Animation** | CSS transitions + Tailwind utilities |
| **System audio** | Web Audio API (`SamsungTVSynth` class — synthesizes relay clicks, CRT whine, system tones) |
| **Live streaming** | `hls.js` for `.m3u8` playback (AajTak + NDTV India) |
| **AI** | Google Gemini 3.1 Flash Lite via `generativelanguage.googleapis.com` |
| **Hosting** | Vercel (static deploys, auto on `git push`) |
| **Asset CDN** | GitHub Releases (8 versioned tags carrying MP4 + MP3 binaries) |
| **AI Coding Agent** | OpenCode CLI with the [master prompt](https://samsung-lcd-tv.vercel.app/OPENCODE_PROMPT.md) deployed as a public artifact |

---

## 🎭 DESIGN PHILOSOPHY

This simulator is a small piece of **preservation art** for bounded broadcast culture — the era when:

- Hardware was physical, bounded, and didn't surveil you
- Software updated on its own schedule, not yours
- Ads played on broadcast time, not on every menu
- The TV was off until you turned it on
- The `:55` mark of every hour gave you a small structured rest

That texture has been systematically eliminated from modern consumer electronics. **This project recreates it functionally, with a 2026 firmware brain bolted on to do what 2010 hardware should have been able to do but couldn't yet.**

It also embeds a personal cultural signature: **the audio bed is Indian + Brazilian + a 2010-era Samsung chassis**, reflecting how global media consumption actually works in 2026 from a non-Western viewer's perspective. The Brazilian funk in the sound test (Batidão da Madrugada Speed Edit) is the author's deliberate signature — the one piece of the simulator that exists purely because it makes the author happy.

---

## 🧪 TRY IT

1. Open [`samsung-lcd-tv.vercel.app`](https://samsung-lcd-tv.vercel.app)
2. Press `P` to power on
3. Press `S` to switch inputs — try **DishTV** (HDMI 3) for the Indian news channels
4. Press `I` to summon the AI Channel Picker — type *"halla bol"* or *"morning news"* or *"khabar"* in Hindi
5. Press `M` → Support → Software Update → see all three OTA methods side by side
6. Wait until the next `:55` of any hour with the TV on for the AajTak Exhale moment
7. (For the brave) Configure a Gemini API key in the AI Picker → get real LLM-powered channel selection

---

## 📦 SISTER PROJECT

The other half of the showcase pair, built with **Gemini CLI** in the same week:

- 🍎 [**macOS 26 "Tahoe" Simulator**](https://macos-26-tahoe.vercel.app) — React 19 + Vite + Framer Motion recreation of Apple's macOS Tahoe interface with Apple Intelligence integration, the Apple TV+ Tahoe ($20/mo fictional tier with full subscription state machine), and the same Sound Test catalog (free classic macOS sounds + premium tracks via the same GitHub Releases CDN).

The two simulators share an asset architecture (this repo's Releases CDN powers both) and an authorial signature (Batidão hidden in the sound test menus of each).

---

## 📜 ATTRIBUTION

Built solo by **Aashman Shukla** ([@AashmanShukla3223](https://github.com/AashmanShukla3223)) in 5 days, using `Antigravity and OpenCode CLI Prompts and Skills` for agentic coding, with [Arena.ai Agent Mode](https://arena.ai) as the design-conversation + verification partner.

OTA architecture, channel curation, aesthetic vision, and the `:55` exhale insight: human-authored.
Code execution and refactoring: AI-assisted via OpenCode CLI.
Verification and bug-catching across 20 release cycles: AI-assisted via Arena.

**Live news streams** (`feeds.intoday.in`, `ndtvindiaelemarchana.akamaized.net`) are public broadcaster feeds, embedded here for educational simulator purposes. AajTak / India Today / NDTV trademarks belong to their respective owners. This project is a **fan-built simulator**, not affiliated with Samsung, DishTV, AajTak, or any broadcaster.

---

## 📜 LICENSE
MIT © 2026 Aashman Shukla | Part of [Antigravity And OpenCode CLI Prompts and Skills](https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills) | Built for the Silicon Surge.
