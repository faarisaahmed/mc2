# AGENTS.md

Shared rules for every AI coding agent working in this repo (Cursor agents, Claude Code, others).
Read this before making changes. The README has the full product description.

## What this is

**MasjidHub**: a static website for a mosque community (demo built around the Muslim Center of
Greater Princeton). Prayer times, Qibla, Islamic calendar, events, a day planner, community chat,
a mosque map, and donations.

- Plain **HTML, CSS, and vanilla JavaScript**. No framework, no bundler, no `npm`, no build step.
- This is the team's repo: faarisaahmed/mc2. "The owner" means Faaris, who reviews and merges.
- The site is **GitHub Pages** from the repo root of `main`: https://faarisaahmed.github.io/mc2/ updates when `main` changes.
  The same `main` also publishes to **Cloudflare Pages** at https://masjid-hub.pages.dev (no build step). Keep links relative
  so both work: one is served from `/mc2/`, the other from `/`. Both hostnames are listed in `LIVE_HOSTS` in `assets/js/db.js`.

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
  The one exception is `server/` (server code for Firebase Cloud Functions, see `server/README.md`); the website itself stays dependency-free.
- Do not add new third-party libraries or CDNs without asking. Approved today: Leaflet 1.9.4 on `map.html`, and the
  Firebase JS SDK (13.1.0, from www.gstatic.com), loaded only through `assets/js/db.js`.
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

### Database (Firebase)

- Firebase project `masjidhub-mc2`, Cloud Firestore only (no Firebase Hosting: the site stays on GitHub Pages).
- All database access goes through `assets/js/db.js` (`window.MH_DB`). It loads the SDK lazily, the first time a page
  needs it. Pages that use it add `<script src="assets/js/db.js"></script>` after `core.js`.
- The web config in `db.js` is public by design. **`firestore.rules` is the security.** Every collection must be
  denied by default and validated field by field. Any PR that touches `firestore.rules` must say so at the top of the
  PR and explain who can read and write what. Never allow public `read` or `list` on anything holding personal data.
- Deploy rules with `firebase deploy --only firestore` (owner only, after merge). Test rule changes in the emulator
  first: `firebase emulators:start --only firestore`.
- Roles (enforced only by `firestore.rules`; the UI just hides what you can't do):
  visitor (no account) · member (signed in) · editor and owner (`mosques/{id}/members/{uid}`, joined by accepting an
  invite sent to their verified email) · site admin (`admins/{uid}` with `perms.mosques` / `perms.applications`, joined by
  accepting an `adminInvites/{email}`) · top admin (one account, matched in `firestore.rules` by the SHA-256 of its email so
  the address isn't in the repo; only they invite, change and remove site admins in the dashboard's "Site admins" tab).
- Collections:
  - `users/{uid}`: name, synced prefs and notification choices. Only that person can read or write it.
  - `admins/{uid}`: site admins: email, name, `perms`. Created only by accepting an invite with exactly its perms; only the
    top admin lists, changes or removes them.
  - `adminInvites/{email}`: pending site-admin invites (doc id = lowercased email). Top admin writes; the invitee reads or declines.
  - `mosques/{id}`: public profile, `iqamah` (`{fajr: "06:15" | "+10"}`), `jumuah` (`["13:15"]`), `published`, `managed`
    (true = events come from the database, not `data.js`), `verified` (site admins only; shows a badge on the mosque page). Subcollections: `members`, `invites` (doc id = lowercased
    email), `events` (same fields as `data.js` events, plus `rsvp`/`volunteer`), `announcements`, `rsvps`
    (doc id = `<event>_<yyyy-mm-dd>_<uid>`).
  - `applications`: Add your mosque. `status`: pending, info (reviewer asked something, see `note`), approved (`mosqueId`),
    rejected. Anyone creates; site admins with `perms.applications` review and may edit details first; signed-in applicants see their own.
    Applicants name a reference at the mosque (`refName`, `refContact`). Reviewers tick `checks` (`listing`, `phone`, `reference`,
    `email`); the dashboard only enables Approve after a phone call or the reference, plus one more check.
- Public pages read content through `assets/js/content.js` (Firestore REST, no SDK, cached in `mh:content`) and
  redraw through `MH.onPrefs` listeners when it changes. `data.js` stays the fallback for mosques not yet managed.
- Server code lives in `server/` (Cloud Functions, Node 22; not named `functions/`, because Cloudflare Pages would
  try to run a folder with that name). It is written but not deployed until the project is on the
  Blaze plan; `server/README.md` has the steps. It sends branded invite emails. Functions bypass `firestore.rules`, so
  changes there need the same care as rule changes.
- Rules can't be tested in the emulator on machines without Java 11+. Test against the live project with throwaway
  accounts that the test deletes afterwards, and never leave test data behind.

### Privacy
- No accounts, cookies, analytics, or tracking. User data stays in `localStorage` under `mh:` keys via `MH.store`.
  When stored prefs need a migration, add a step to `PREFS_MIGRATIONS` in `core.js` and bump `PREFS_VERSION`.
  Never reset a setting the visitor may have chosen.
- Network calls only to the existing map services (Esri tiles, OpenStreetMap Overpass and Nominatim) and Firebase, and only when the user uses those features.
- Never commit API keys or secrets. Anything needing a key (e.g. a real AI planner) needs a server; propose it, don't hard-code it.

## Git workflow

- Never commit directly to `main`; it deploys the live site. Work on a branch and open a PR into `main`.
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
- For a large change, also link an explainer page in the PR.

### Pull requests

Faaris reviews every PR by hand. A PR that is quick to review gets merged quickly.

- **Fill in `.github/pull_request_template.md` as the PR body.** `gh pr create --body ...` and `--fill` skip the
  template, so read the file and pass the completed text yourself (e.g. `--body-file`). Keep every heading.
- **One topic per PR.** A bug fix, a feature, or a docs change, not several bundled. As a guide, stay under about
  300 changed lines and 10 files. If the work grew bigger, split it into several PRs, each one reviewable on its own.
- **Branch from the team's `main`, not your fork's `main`.** Run `git fetch upstream && git switch -c fix/<name> upstream/main`.
  The PR must not contain merge commits from your fork (e.g. "Merge pull request #12 from you/..."): their `#12` would
  link to the wrong PR here. If it does, rebuild the branch from `upstream/main` and cherry-pick only your own commits.
  (One-time setup in a fork: `git remote add upstream https://github.com/faarisaahmed/mc2.git`.)
- **Everything the reviewer needs goes in the PR itself.** No private links (claude.ai artifacts, personal docs). Test
  site links on your fork are welcome as an extra, never as a replacement for screenshots.
- **Say what you did and didn't check.** "Not tested on a real iPhone" is useful. Don't claim a check you didn't run.
- **Don't mix in unrelated changes.** No reformatting, renames, or README rewrites unless the PR is about them.
  Agent tooling (`AGENTS.md`, `.claude/`) changes go in their own `docs/` PR.
- **Before opening or updating**, rebase on the latest `upstream/main`, then re-run `/verify-page` on the touched pages.
- **Draft first.** Open it with `gh pr create --draft` and mark it ready with `gh pr ready` once every box in
  "How I checked it" is either ticked or explained.

### Working together

Several people, each with their own AI agent, may change the code at the same time. These rules keep that from turning into conflicts.

- **Claim a task first.** Every code task is a GitHub Issue on faarisaahmed/mc2. Assign yourself before starting, and say "Closes #N" in the PR.
- **Open a draft PR early**, so others see what you are touching while the work is in progress.
- **Shared files, one person at a time.** `core.js`, `site.css` and `data.js` are used by every page. If someone has an open PR touching one of them, coordinate before changing it too. Keep big changes to these files in their own small PR and merge it quickly.
- **Pages rarely clash.** Two different `*.html` pages can be worked on at once.
- **Short-lived branches.** Small PRs, merged within a day or two. Before opening or updating a PR, run `git pull origin main` on your branch so conflicts show up on your side first.
- **Review each other's PRs.** `main` only changes through a PR with one approval.
- **One folder per agent.** Two agents in the same folder overwrite each other. For a second session, use `git worktree add ../mc2-<task> -b feat/<task>` and serve it on another port (`python3 -m http.server 8001`).
- Personal notes stay out of the repo: `CLAUDE.local.md` and any local knowledge base are never committed.

### Working from a fork

Teammates without write access fork the repo and can turn on GitHub Pages for their fork, which gives a free test site.
Build and check on the fork's own site (phone, light/dark) first, then open a PR into faarisaahmed/mc2 that links it.
