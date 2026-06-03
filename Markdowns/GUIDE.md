# Samsung C5000 Simulator — Channel & EPG Guide

> **Live URL:** `https://samsung-lcd-tv.vercel.app`
> **Current firmware:** v1.0.26 (Silver) | **Next:** v1.0.27 (Bronze)

---

## 📺 Channel Lineup

All DishTV channels are organized by **Network → Category → Channel**.

---

### TV Today Network

#### AajTak (Hindi News)

Flagship Hindi news channel of the TV Today Network. 13 channels covering bulletins, debates, and special programs.

| # | Channel | Show | Time Slot | Type |
|---|---------|------|-----------|------|
| 121 | AajTak — Main Bulletin | Main Bulletin | Morning | MP4 |
| 122 | AajTak — Saas Bahu aur Betiyaan | Saas Bahu aur Betiyaan | Daytime | MP4 |
| 123 | AajTak — Special Report (Edition I) | Special Report | 8:30 PM | MP4 |
| 124 | AajTak — Aaj Subah | Aaj Subah | 10:00 AM | MP4 |
| 125 | AajTak — e-Agenda | e-Agenda | Daytime | MP4 |
| 126 | AajTak — Halla Bol (Edition I, 6 PM) | Halla Bol | 6:00 PM | MP4 |
| 127 | AajTak — Das Tak | Das Tak | 10:00 PM | MP4 |
| 128 | AajTak — Halla Bol (Edition II, 6:30 PM) | Halla Bol | 6:30 PM | MP4 |
| 129 | AajTak — Delhi Exit Poll | Delhi Exit Poll | Special | MP4 |
| 130 | AajTak — Special Report (Edition II) | Special Report | 8:30 PM Rerun | MP4 |
| 131 | AajTak — Ek aur Ek Gyarah | Ek aur Ek Gyarah | 11:00 AM | MP4 |
| 132 | AajTak — Halla Bol (Edition III, 6 PM Rerun) | Halla Bol | 6:00 PM Rerun | MP4 |
| 133 | AajTak — Khabardar | Khabardar | 9:00 PM | MP4 |
| 134 | AajTak Live | — | 24×7 | HLS |

**Duplicate show guide:**

| Show | Editions | Channels |
|------|----------|----------|
| Special Report | Edition I (8:30 PM), Edition II (Rerun) | 123, 130 |
| Halla Bol | Edition I (6 PM), Edition II (6:30 PM), Edition III (6 PM Rerun) | 126, 128, 132 |

#### India Today (English News)

| # | Channel | Source | Notes |
|---|---------|--------|-------|
| 200 | India Today (2020 Archive) | `dishtv_source16.mp4` (GH9) | v1.0.28 — planned |
| 201 | [TBD HLS Stream] | TBD | v1.0.28 — planned |

---

### NDTV News Network

#### NDTV India (Hindi News)

| # | Channel | Type | Notes |
|---|---------|------|-------|
| 135 | NDTV India Live | HLS | Live stream — only live shows currently |

#### NDTV 24×7 (English News — Upcoming)

Planned for a future release. Same live-shows-only format as NDTV India.

---

### Kids (Planned — v1.0.29 / v1.0.30)

| # | Channel | Type | Release |
|---|---------|------|---------|
| 500 | Peppa Pig — Episode 1 (Hindi dub) | MP4 | v1.0.29 |
| 501 | Peppa Pig — Episode 2 (Hindi dub) | MP4 | v1.0.29 |
| 502 | Paw Patrol — Episode 1 (Hindi dub) | MP4 | v1.0.29 |
| 503 | Paw Patrol — Episode 2 (Hindi dub) | MP4 | v1.0.29 |
| 504 | Chikoo Aur Bunty — Episode 1 | MP4 | v1.0.30 |
| 505 | Chikoo Aur Bunty — Episode 2 | MP4 | v1.0.30 |
| 506 | Motu Patlu — Episode 1 | MP4 | v1.0.30 |
| 507 | Motu Patlu — Episode 2 | MP4 | v1.0.30 |

---

### Other Inputs

| # | Input | Device | Notes |
|---|-------|--------|-------|
| 0 | TV/RF | No Signal | Static |
| 1 | AV/Component | Nintendo Wii | Wii Sports demo loop |
| 2 | HDMI 1 | Apple TV | tvOS screensaver loop |
| 3 | HDMI 2 | PlayStation 3 | XMB menu recreation |

---

## 📋 EPG (Electronic Program Guide)

Press **`G`** (Guide) or the **GUIDE** button on the DishTV remote to open the program guide overlay.

### AajTak Primetime Grid

| Time | Ch | Show |
|------|----|------|
| 10:00 AM | 124 | AajTak — Aaj Subah |
| 11:00 AM | 131 | AajTak — Ek aur Ek Gyarah |
| 5:00 PM | 136 | AajTak — Dangal *(v1.0.28)* |
| 6:00 PM | 126 | AajTak — Halla Bol (Edition I) |
| 6:30 PM | 128 | AajTak — Halla Bol (Edition II) |
| 7:00 PM | 137 | AajTak — Desh Tak *(v1.0.28)* |
| 8:30 PM | 123 | AajTak — Special Report (Edition I) |
| 9:00 PM | 133 | AajTak — Khabardar |
| 9:30 PM | 127 | AajTak — Black and White *(planned)* |
| 10:00 PM | 127 | AajTak — Das Tak |

Press **Back** (Escape) to close.

---

## 🧭 Navigation Hierarchy (AI Picker)

The AI Picker uses a 3-level hierarchical structure:

```
Category ─┬─ News ──── Network ──── Channel
           │          ├── AajTak ── 121-134
           │          └── NDTV ──── 135
           │
           ├─ Kids (v1.0.29+)
           │
           └─ Other Inputs
```

### AajTak / TV Today Network
```
📰 NEWS
  └── TV Today Network
        ├── AajTak (Hindi)
        │     ├── 121 · Main Bulletin
        │     ├── 122 · Saas Bahu aur Betiyaan
        │     ├── 123 · Special Report (Edition I)
        │     ├── 124 · Aaj Subah (10 AM)
        │     ├── 125 · e-Agenda
        │     ├── 126 · Halla Bol (Edition I, 6 PM)
        │     ├── 127 · Das Tak (10 PM)
        │     ├── 128 · Halla Bol (Edition II, 6:30 PM)
        │     ├── 129 · Delhi Exit Poll
        │     ├── 130 · Special Report (Edition II)
        │     ├── 131 · Ek aur Ek Gyarah
        │     ├── 132 · Halla Bol (Edition III, 6 PM Rerun)
        │     ├── 133 · Khabardar (9 PM)
        │     └── 134 · AajTak Live (HLS)
        │
        └── India Today (English) — planned v1.0.28
              ├── 200 · India Today (2020 Archive)
              └── 201 · [TBD HLS stream]
```

### NDTV News Network
```
📰 NEWS
  └── NDTV News Network
        ├── NDTV India (Hindi)
        │     └── 135 · NDTV India Live (HLS)
        │
        └── NDTV 24×7 (English) — planned
              └── [TBD channel]
```

Note: NDTV currently has only live shows. No archived MP4 content. All programming is 24×7 live broadcasting.

---

## 🎮 Remote Control

| Key | Function |
|-----|----------|
| Arrow keys | Menu navigation / Wii / PS3 |
| Enter | Select / Activate |
| Backspace / Escape | Back / Close overlay |
| M | Toggle Menu |
| S | Toggle Source Menu |
| P | Toggle Power |
| G | Open EPG Guide |
| I | Open AI Channel Picker |
| B | Cycle subtitles (Off → English → Hindi) |
| F1 | Shortcut overlay |
| 0-9 | DishTV channel number input |
| CH+/CH- | Channel up/down |

---

## 📦 Profiles & Content Sources

- **MP4 assets:** GitHub Releases (`GH` – `GH8` URL constants)
- **HLS streams:** Live m3u8 URLs for AajTak Live (Ch 134) and NDTV India (Ch 135)
- **USB profiles:** `/usb-images/*.json` — 7 profiles (normal, empty, corrupted, multi-firmware, music, vacation, older-firmware)
