# Gloomhaven Companion

A local, install-free campaign tracker for **Gloomhaven (1st edition)**. Record your
party's progress and explore the unlock tree, classes, items, achievements, and a set
of deductions computed from your current state.

> Built for personal campaign tracking. Edition: 1st (scenario numbering and items
> differ from 2nd edition / Frosthaven).

## Use it

- **Hosted:** open the GitHub Pages URL for this repo.
- **Locally:** open `index.html` — but browsers can't `fetch` from `file://`, so the
  bundled `knowledge.js` is loaded via a `<script>` tag and everything works offline.

Best in **Chrome or Edge**: these support the File System Access API, so the tool can
**auto-save** your campaign to a folder you grant once. In other browsers (Firefox /
Safari) auto-save is off — use **Load file…** / **Export** instead.

### How saving works

- The **knowledge base** (rules: scenarios, classes, items, achievements, personal
  quests) is baked into the app, read-only.
- Your **campaign save** is the only thing written. Click **Open campaign folder**,
  pick a folder once, and the tool reads/writes `saves/<party>.json` there. The grant
  is remembered across sessions. Multiple parties = multiple files.
- No database. Each change rewrites the JSON file.

## Screens

- **Tree** — the campaign unlock graph. `✅` completed · `🔓` available · `⏳` unlocked
  but gated · `🔒` locked (shown as a numbered door only, never named).
- **Record** — toggle scenarios unlocked/completed, set prosperity & reputation, add
  characters, record unlocked classes / achievements / items, keep notes. Auto-saves.
- **Reference** — classes, items (shop at your prosperity), and earned achievements.
  Locked content is summarized as counts, never revealed.
- **Deductions** — available plays, gated scenarios with reasons, "doors ahead",
  branch warnings, and shop outlook — all computed from your state.

## Spoiler policy

The view layer hides locked content and only shows non-spoiler *shapes* (counts, the
existence of a numbered door). Note that the full rules data ships inside `knowledge.js`
for the app to work — so this repository's source contains everything. If you want to
avoid even accidental source-level spoilers, keep the repo private.

## Data

Canonical rules live in `data/*.json`. They are compiled into `knowledge.js`:

```sh
node tools/gen-knowledge.mjs   # or: npm run gen
```

Re-run after editing any `data/*.json`. Forgotten Circles content (scenarios 96+) is
not included yet.

## Develop

```sh
npm test      # runs the deductions test suite (Node's built-in runner)
```

No build step, no framework — vanilla HTML/CSS/JS.
