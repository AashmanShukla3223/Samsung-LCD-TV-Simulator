# 📺 Samsung C5000 LCD TV Simulator
### **A period-authentic 2010 LCD TV, rebuilt with a 2026 AI brain.**

[![Live: samsung-lcd-tv.vercel.app](https://img.shields.io/badge/Live-samsung--lcd--tv.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://samsung-lcd-tv.vercel.app)
[![Version](https://img.shields.io/badge/dynamic/json?label=Version&query=%24.version&url=https%3A%2F%2Fsamsung-lcd-tv.vercel.app%2Fversion.json&style=for-the-badge&color=amber)](https://samsung-lcd-tv.vercel.app/version.json)
[![Multi-AI](https://img.shields.io/badge/AI-Gemini%20%2B%20Groq%20%2B%20OpenRouter-purple?style=for-the-badge)](https://samsung-lcd-tv.vercel.app/api/ai-pick)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Era: 2010 Samsung BN59](https://img.shields.io/badge/Era-2010%20Samsung%20BN59-zinc?style=for-the-badge)](https://samsung-lcd-tv.vercel.app)

---

## 🎯 THE PITCH
A faithful recreation of a **Samsung C5000 / BN59-series LCD TV from 2010**, deployed at [`samsung-lcd-tv.vercel.app`](https://samsung-lcd-tv.vercel.app). Five inputs, swappable remotes, real live news streams, a three-path firmware OTA system, and a **tri-provider AI Channel Picker** that races Groq, Gemini, and OpenRouter for the fastest, most resilient channel-selection response.

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

All three converge at the same `showUpdateOverlay()` install flow. Cross-method **conflict resolver** when two paths offer different versions. **Four USB profiles** (`normal`, `empty`, `corrupted`, `multi-firmware`) for testing every error path. Period-authentic *"Update in 3 seconds…"* reboot animation.

### 🧠 Tri-Provider AI Channel Picker (`ai-picker.js` + `/api/ai-pick`)
A **fully client-side RAG pipeline** that races three LLM providers for the fastest natural-language channel selection:

| Provider | Model | Latency | Role |
|----------|-------|---------|------|
| ⚡ **Groq** | `llama-3.3-70b-versatile` | ~500 ms | Fast path — usually wins the race |
| 🤖 **Gemini** | `gemini-3.1-flash-lite` | ~3 s | Deep reasoning fallback |
| 🆓 **OpenRouter** | `deepseek/deepseek-r1:free` | ~5–8 s | Free-tier chain-of-thought "deep thinker" failover |

**Seven modes** (`auto` / `groq` / `gemini` / `openrouter` / `race` / `all` / `both`), **per-provider toggles in the UI**, **bring-your-own-key per provider** (overrides server keys if pasted), **TF-IDF retrieval** over a 14-channel DishTV metadata corpus runs client-side before the LLM call, **bilingual** (English + Hindi tags + responses), **graceful degradation** to pure retrieval-only mode when no providers respond. Server proxy at `/api/ai-pick` hides API keys; client `ai-picker.js` orchestrates the race.

### 🕰️ AajTak `:55` Hourly Exhale Window
At the `:55` mark of every real-time hour, while the TV is on, a soft overlay fades in:

```
🌬️  AajTak: Exhale
    Take a deep breath. The news can wait.
    Auto-dismiss in 60s
```

Plays a **220 Hz tone** for 0.8 s — engineered parasympathetic frequency, matching the actual transitional moments of Indian primetime news broadcasts. The simulator becomes accidentally meditative once an hour, by design.

### 📡 Real Live HLS Streams + Curated AajTak MP4 Channels
- **Channel 134** — AajTak Live (HLS via `feeds.intoday.in`)
- **Channel 135** — NDTV India Live (HLS via Akamai)
- **Channels 121–133** — Curated AajTak content (Khabardar, Halla Bol, Special Report, Aaj Subah, Dangal, and more) hosted on GitHub Releases

### 💾 Decoupled Asset CDN Architecture
The whole reason the simulator ships real video content: **GitHub Releases as a free, versioned binary CDN** to escape Vercel's deployment size limits.

```js
const GH  = '.../releases/download/v1.0/';
const GH2 = '.../releases/download/v1.0.1/';
// …through GH8 = '.../releases/download/v1.0.7/'  ← Khabardar Channel 133
```

`APP_VERSION` (the firmware version users see) is **decoupled** from the asset-bundle release tags. Bumping content doesn't force a fake firmware bump — and a folder override during recovery couldn't touch the assets.

### 🛡️ Disaster-Recovery Tested
Survived an accidental folder-override scare in production: full v1.0.20 state recovered in under an hour via a single misplaced-file move, because the architecture had separated assets, manifests, code, and deployment infrastructure into independently restorable layers. **Resilience by architecture, not by luck.**

---

## 📂 PROJECT STRUCTURE

```
Samsung-LCD-TV-Simulator/
├── Samsung_TV.html          # ~4,200 lines vanilla HTML/CSS/JS. The whole simulator.
├── ai-picker.js             # Client-side RAG orchestrator (TF-IDF + tri-provider race)
├── index.html               # Root landing page → meta-refresh to Samsung_TV.html
├── version.json             # Internet OTA manifest
├── vercel.json              # Function region pin (Mumbai / bom1)
├── api/
│   └── ai-pick.js           # Serverless function — multi-AI router with 7 modes
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

| | |
|---|---|
| **Primary URL** | [`samsung-lcd-tv.vercel.app`](https://samsung-lcd-tv.vercel.app) |
| **Legacy alias** | `project-78d0r.vercel.app` → 307 redirect to primary |
| **Hosting** | Vercel (static + serverless `/api/ai-pick`) |
| **Function region** | `bom1` (Mumbai) — low latency for India |
| **Asset CDN** | GitHub Releases — `v1.0` through `v1.0.7` tags |
| **Build step** | None — single static HTML file + sibling JS |

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

## 🛠️ BUILD STACK

| Layer | Tool |
|-------|------|
| **Markup + Layout** | Vanilla HTML + Tailwind CSS (CDN) |
| **Logic** | Vanilla JS (no framework, no build step) |
| **Animation** | CSS transitions + Tailwind utilities |
| **System audio** | Web Audio API (`SamsungTVSynth` class — synthesizes relay clicks, CRT whine, system tones) |
| **Live streaming** | `hls.js` for `.m3u8` playback (AajTak + NDTV India) |
| **AI Routing** | Custom serverless function `/api/ai-pick` racing Groq + Gemini + OpenRouter |
| **RAG** | TF-IDF + cosine similarity, client-side |
| **Hosting** | Vercel (static deploys, auto on `git push`) |
| **Asset CDN** | GitHub Releases (8 versioned tags carrying MP4 + MP3 binaries) |
| **AI Coding Workflow** | [Antigravity + OpenCode CLI Prompts and Skills](https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills) |

---

## 🎭 DESIGN PHILOSOPHY

This simulator is a small piece of **preservation art** for bounded broadcast culture — the era when:

- Hardware was physical, bounded, and didn't surveil you
- Software updated on its own schedule, not yours
- Ads played on broadcast time, not on every menu
- The TV was off until you turned it on
- The `:55` mark of every hour gave you a small structured rest

That texture has been systematically eliminated from modern consumer electronics. **This project recreates it functionally, with a 2026 firmware brain bolted on to do what 2010 hardware should have been able to do but couldn't yet.**

The audio bed embeds a personal signature: **Indian content (AajTak) + Brazilian funk (Batidão) on a 2010 Samsung chassis**, reflecting how global media consumption actually works in 2026 from a non-Western viewer's perspective.

---

## 🧪 TRY IT

1. Open [`samsung-lcd-tv.vercel.app`](https://samsung-lcd-tv.vercel.app)
2. Press `P` to power on
3. Press `S` to switch inputs — try **DishTV** (HDMI 3) for the Indian news channels
4. Press `I` to summon the AI Channel Picker — type *"halla bol"* / *"morning news"* / *"khabar"* (in Hindi or English)
5. Press `M` → Support → Software Update → see all three OTA methods side by side
6. Wait until the next `:55` of any hour with the TV on for the AajTak Exhale moment
7. (Power-user mode) Configure your own Gemini / Groq / OpenRouter keys in the AI Picker modal to override the server defaults

---

## 📦 RELATED PROJECT

The other half of the showcase pair, built with the same toolkit + asset CDN:

- 🍎 [**macOS 26 "Tahoe" Simulator**](https://macos-26-tahoe.vercel.app) — React 19 + Vite + Framer Motion recreation of Apple's macOS Tahoe interface with Apple Intelligence integration, the Apple TV+ Tahoe (\$20/mo fictional tier) with full subscription state machine, and the same Sound Test catalog via the same GitHub Releases CDN.

---

## 📜 LICENSE

MIT — see [LICENSE](LICENSE).

**Live news streams** (`feeds.intoday.in`, `ndtvindiaelemarchana.akamaized.net`) are public broadcaster feeds, embedded here for educational simulator purposes. **AajTak / India Today / NDTV / Samsung / DishTV / Sony / Nintendo / Apple** trademarks belong to their respective owners. This project is a **fan-built simulator**, not affiliated with any of them.

---

*Built with [Antigravity & OpenCode CLI Prompts and Skills](https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills) · Hosted on Vercel · Powered by GitHub Releases as binary CDN*
