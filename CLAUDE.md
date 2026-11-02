# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git workflow (required)

Commit and push to GitHub regularly as you work, so no progress is ever lost:

- Commit after each logical unit of work (a feature, a fix, a content update), not just at the end of a session. Don't leave finished work uncommitted.
- Push to `origin` right after committing. Pushing to `main` deploys the live site via GitHub Pages, so only push work that leaves the site working.
- Write clean commit messages in the style already used in `git log`: a short, plain-English summary of what changed for the user, imperative or descriptive (e.g. "Fix community chat overflowing the screen on phones", "Map: calm gray basemap that follows light/dark"). Use a `Area: ...` prefix when it helps.
- Stage specific files rather than `git add -A` so stray local files don't get committed.

## Running

No build step, no dependencies, no test suite or linter. Serve the repo root over HTTP (location and some browser APIs don't work from `file://`):

```bash
python -m http.server 8000   # then open http://localhost:8000
```

The phone compass on `qibla.html` needs HTTPS and a real device; test it on the deployed GitHub Pages site.

## Architecture

MasjidHub is a static multi-page site (plain HTML/CSS/vanilla JS) for a mosque community, built around the Muslim Center of Greater Princeton. Everything runs in the browser; there is no backend and no API keys.

Every page follows the same load order, and this order matters:

1. `assets/js/boot.js` in `<head>`: reads `localStorage["mh:prefs"]` and applies theme, text size, `lang`/`dir` before first paint (prevents flashes). It duplicates a little logic from core.js on purpose because it must run before anything else.
2. `assets/js/data.js`: content (mosques, events, causes, interests, age groups). **Almost all content edits go here.** Event schema (`ages`, `audience`, `interests`, `recur`, `after: "isha"`, `sample: true`) is documented in README.md under "Editing content".
3. `assets/js/core.js`: the shared engine, exposed as `window.MH` (see the "Public API" block at the bottom of the file). Contains preferences (`MH.prefs`, `MH.setPrefs`, `MH.onPrefs` listeners), prayer-time astronomy (`prayerTimes()`), Hijri dates (via `Intl` `islamic-umalqura` with arithmetic fallback), Qibla, event occurrence/scoring, the inline SVG icon set (`MH.icon`; no emoji anywhere), the shared top-bar nav and settings/onboarding wizard (`renderChrome`, `openSettings`), and translation.
4. An inline `<script>` at the bottom of each page that renders that page using `MH.*`.

`assets/js/planner.js` (loaded only by `planner.html`) is a rule-based "AI" day planner: it parses plain-English schedules and places each prayer in its valid window. It is deliberately not an LLM.

`map.html` is the only page with an external library (Leaflet 1.9.4) plus OpenStreetMap Overpass/Nominatim and Esri tiles.

### Key conventions

- **Persistence**: all user state (prefs, chat, planner drafts, mosque applications) lives in `localStorage` under `mh:` keys via `MH.store`. Bump `PREFS_VERSION` in core.js when a prefs migration is needed.
- **Translation**: pages are written in English only. core.js walks the DOM and swaps text using `assets/i18n/<lang>.json` dictionaries (English string → translation, with `{placeholder}` patterns supported), including a MutationObserver for dynamically rendered content. Don't hardcode translated strings in HTML. Note: the `assets/i18n/` folder is not currently in the repo, so non-English languages fall back to English.
- **Styling**: all styles in `assets/css/site.css`; colors are CSS tokens at the top, redefined for dark mode. Use tokens, never raw colors. Mobile-first (tested at 390px), 44px+ touch targets, `aria-*` on toggles/live regions.
- **Accuracy**: prayer times were verified against the Aladhan API (see README "Accuracy"). Changes to prayer math, Hijri, or Qibla code should be re-checked against Aladhan before committing.
- **Real vs demo**: README's "What is real and what is demo" table is the source of truth. Keep demo features clearly labelled (chat, donations, planner, mosque applications) and never collect real payment details.
