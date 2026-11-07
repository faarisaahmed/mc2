---
name: verify-page
description: Verify a MasjidHub page in a real browser after a change - local server, console errors, light and dark mode, 390px phone width with no sideways scroll, larger-text setting, and right-to-left layout. Use after editing any *.html page, site.css, core.js, data.js or planner.js, before committing or opening a PR, or when the user asks to check, test or screenshot a page.
argument-hint: "[page.html ...]  (default: the pages touched by the current diff)"
---

# Verify a MasjidHub page

Check the pages in $ARGUMENTS. If no pages were given, work out which pages the current change affects:
`git diff --name-only main...HEAD` plus uncommitted changes. A change to `assets/css/site.css`, `assets/js/core.js`,
`assets/js/boot.js` or `assets/js/data.js` affects every page, so check `index.html` plus the pages whose features changed.

## Steps

1. **Serve it.** Start `python -m http.server 8000` from the repo root in the background (never `file://`;
   geolocation, fetch and i18n need http). Reuse a server that is already running on 8000.
2. **Load each page** with Playwright MCP at `http://localhost:8000/<page>.html`.
3. **Console.** Read console messages. Any error is a failure. Warnings: report, don't fail.
4. **Light and dark.** Check both: emulate `prefers-color-scheme`, and also the forced theme in Settings if the change
   touched theme code. Look for hard-coded colours that don't switch (AGENTS.md: tokens only).
5. **Phone width.** Resize to 390x844. Confirm no horizontal scroll:
   `document.documentElement.scrollWidth <= window.innerWidth`. Touch targets at least 44px for anything new.
6. **Larger text.** Cycle the text-size button to extra-large and re-check that nothing overlaps or clips.
7. **Right-to-left.** If layout or CSS changed, switch the language to Arabic (sets `dir="rtl"`) and check alignment
   and icons that should mirror.
8. **Prayer math.** If `prayerTimes()`, Hijri or Qibla code changed, compare today's times for West Windsor against the
   Aladhan API (Hanafi Asr, ISNA) and report the minutes of difference per prayer.
9. **Close the browser** and stop the server if you started it.

## Report

One short table per page: check | result | note. Then a one-line verdict: ready, or what to fix first.
Take a screenshot only where something failed or the user asked for one. Don't fix anything unasked; list it.
