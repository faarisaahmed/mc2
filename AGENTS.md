# AGENTS.md

Shared rules for every AI coding agent working in this repo (Cursor agents, Claude Code, others).
Read this before making changes. The README has the full product description.

## What this is

**MasjidHub**: a static website for a mosque community (demo built around the Muslim Center of
Greater Princeton). Prayer times, Qibla, Islamic calendar, events, a day planner, community chat,
a mosque map, and donations.

- Plain **HTML, CSS, and vanilla JavaScript**. No framework, no bundler, no `npm`, no build step.
- This repo is Nasir's fork. `origin` = NMunir-afk/mc2, `upstream` = faarisaahmed/mc2 (Faaris, the team's repo).
- Two sites, both **GitHub Pages** from the repo root of `main`:
  - Test site: https://nmunir-afk.github.io/mc2/ deploys when this fork's `main` changes.
  - Team site: https://faarisaahmed.github.io/mc2/ deploys only when Faaris merges into his `main`.
- "The owner" means Faaris for anything meant to be merged upstream; Nasir decides for fork-only experiments.

## Run and check

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Always use a local server, not `file://` (geolocation, `fetch`, and i18n need `http://`).
There is no test suite. Verify changes by loading the affected pages in a browser and checking:

- No errors in the browser console
- Light **and** dark mode
- Phone width (390px) with no horizontal scrolling
- Prayer times still match Aladhan if you touched prayer math (see README "Accuracy")

## Layout

| Path | Purpose |
|---|---|
| `*.html` (root) | One file per page. Each loads `boot.js` (in `<head>`), `data.js`, `core.js`, then its own inline script |
| `assets/js/boot.js` | Applies saved theme, text size, and language before first paint. Keep it tiny and dependency-free |
| `assets/js/core.js` | Shared engine: settings, prayer math, Hijri, Qibla, icons, nav, setup, i18n |
| `assets/js/data.js` | **Content**: mosques, events, interests, age groups, causes. Edit content here, not in HTML |
| `assets/js/planner.js` | Day planner engine (rule-based, runs in the browser) |
| `assets/css/site.css` | All styles. Design tokens at the top |
| `assets/i18n/<lang>.json` | Translations: maps English text to translated text (see i18n below) |
| `docs/readme/` | README images only |
| `manifest.webmanifest` | App name, icons, colours and shortcuts for installing the site as an app |
| `sw.js` | Service worker: saves the site's own files so pages open offline. Add new pages or scripts to `SHELL` and bump `VERSION` |

### Load order (it matters)

Every page loads scripts in this order:

1. `boot.js` in `<head>`: reads `localStorage["mh:prefs"]` and applies theme, text size, and `lang`/`dir`
   before first paint. It duplicates a little logic from `core.js` on purpose, because it must run first.
2. `data.js`: content.
3. `core.js`: the shared engine, exposed as `window.MH` (see the "Public API" block at the bottom of the file):
   prefs (`MH.prefs`, `MH.setPrefs`, `MH.onPrefs`), `prayerTimes()`, Hijri (`Intl` `islamic-umalqura` with an
   arithmetic fallback), Qibla, event occurrence and scoring, the SVG icon set (`MH.icon`), the shared nav and
   settings/onboarding wizard (`renderChrome`, `openSettings`), and translation.
4. An inline `<script>` at the bottom of the page that renders it using `MH.*`.

`planner.js` is loaded only by `planner.html`. It is a rule-based planner, deliberately not an LLM.

## Rules

### Stack
- Do not add a framework, build tool, `package.json`, or transpiled code without the owner agreeing first.
- Do not add new third-party libraries or CDNs without asking. The only one today is Leaflet 1.9.4 on `map.html`.
- Write modern vanilla JS that runs directly in current browsers. No TypeScript, no JSX.
- Reuse helpers in `core.js` (icons, nav, settings, prayer math) instead of duplicating them per page.

### Content and data
- New mosques, events, services, and causes go in `assets/js/data.js` using the field formats in the README ("Editing content").
- Never invent facts about a real mosque, person, or scholar. Placeholder times must set `sample: true`
  so the page shows "Confirm with the mosque."
- "Ask the Imam" and similar features must never fabricate answers attributed to a real person.
- The README table "What is real and what is demo" is the source of truth. Keep demo features (chat, donations,
  planner, mosque applications) clearly labelled, and never collect real payment details.

### Religious accuracy
- Prayer times, Hijri dates, and Qibla must stay correct. If you change that math, re-check against
  the Aladhan API and say what you checked in the PR.
- Default Asr method is Hanafi. Don't change defaults without the owner's agreement.
- Use respectful, standard terminology and spellings already used in the site (salah, Jumu'ah, iqamah, ﷺ in Amiri).

### Design
- Use the CSS tokens in `site.css` (`--green`, `--green-deep`, `--gold`, etc.). No hard-coded colors.
  Every new color must also work in dark mode.
- Fonts: Plus Jakarta Sans for UI, Amiri for Arabic. Icons: the existing line-icon set in `core.js`. **No emoji.**
- Follow the existing layout patterns (eyebrow, headline, subhead, two actions; large tiles).

### Accessibility (required, not optional)
- Touch targets at least 44px, visible keyboard focus, labelled form fields.
- Use `aria-pressed` for toggles and `aria-live` for live-updating text, like the existing pages.
- Respect `prefers-reduced-motion`. Text must work with the "larger text" setting.
- Layout must work right-to-left (Arabic, Urdu): prefer logical CSS properties (`margin-inline-start`, `inset-inline-end`).

### i18n
- Pages are written in English. Translation files `assets/i18n/<lang>.json` map the English string to its translation;
  `{placeholders}` hold names or numbers. Untranslated text falls back to English.
- When you change visible English text, the old key in each language file becomes stale. Update or flag it.
- Mark text that must not be translated (names, Arabic, language names) with `translate="no"`.

### Privacy
- No accounts, cookies, analytics, or tracking. User data stays in `localStorage` under `mh:` keys via `MH.store`.
  Bump `PREFS_VERSION` in `core.js` when stored prefs need a migration.
- Network calls only to the existing map services (Esri tiles, OpenStreetMap Overpass and Nominatim), and only when the user uses those features.
- Never commit API keys or secrets. Anything needing a key (e.g. a real AI planner) needs a server; propose it, don't hard-code it.

## Git workflow

- Never commit directly to `main`; it deploys the test site. Work on a branch and open a PR into this fork's `main`.
- Branch names: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Commit on your branch after each logical unit of work and push it, so progress is never lost.
- Commit messages match the existing `git log` style: a short, plain-English summary of what changed for the user,
  e.g. "Fix community chat overflowing the screen on phones". Use an `Area: ...` prefix when it helps
  (e.g. "Map: calm gray basemap that follows light/dark").
- Stage specific files, not `git add -A`, so stray local files don't get committed.
- One task per branch and PR. Keep diffs focused; don't reformat files you didn't otherwise change.
- Multiple agents may be working at once. Before starting, pull `main`; avoid broad edits to
  `core.js` and `site.css` unless the task needs them, since those are shared by every page.
- PR description: what changed, which pages you checked, and screenshots for visual changes.
- To pull in upstream changes: `git fetch upstream && git merge upstream/main` on a branch, then PR.

### Test here, then offer upstream

1. Branch from this fork's `main`, build, and open a PR into this fork's `main`. Merging it updates the test site.
2. Check the change on the test site (phone, light/dark) before offering it.
3. To offer it to Faaris, copy the branch onto his `main` so the PR holds only that change, not fork-only commits:
   `git fetch upstream && git switch -c up/<name> <branch> && git rebase --onto upstream/main main`
   then `git push -u origin up/<name>` and
   `gh pr create --repo faarisaahmed/mc2 --base main --head NMunir-afk:up/<name>`.
4. The upstream PR description links the test site, lists the pages checked, and includes screenshots.
   For a large change, also link an explainer page.
- Opening a PR on Faaris's repo is outward-facing: ask Nasir before step 3.
