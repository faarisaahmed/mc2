<!--
PR checklist for MasjidHub. AI agents: fill in every section below and pass it as the PR body
(gh pr create does NOT use this template when --body is given, so copy it in yourself).
Delete these comment lines. Write "None" or "N/A" rather than deleting a section.
-->

Closes #<!-- issue number -->

## What changed

<!-- 1–5 bullets, written for a visitor or teammate, not for the code. One topic per PR. -->
-

## Why

<!-- The bug or need. For a bug: what happened before, what happens now. -->

## Files touched

<!-- Tick any shared file this PR changes. These affect every page, so keep their changes small. -->
- [ ] `assets/js/core.js`
- [ ] `assets/css/site.css`
- [ ] `assets/js/data.js`
- [ ] `assets/js/boot.js`
- [ ] `sw.js`: if you added or renamed a page or asset, it's in `SHELL` and `VERSION` is bumped
- [ ] None of the above (page-only change)

## How I checked it

<!-- Say what you actually did, not what should work. Unchecked boxes are fine if you say why. -->
Pages checked:

- [ ] Ran `/verify-page` (or did the same steps by hand) on a local server, not `file://`
- [ ] No console errors
- [ ] Light and dark mode
- [ ] 390px phone width, no sideways scroll
- [ ] Extra-large text setting
- [ ] Right-to-left layout (only if layout/CSS changed)
- [ ] Prayer times vs Aladhan (only if prayer, Hijri or Qibla math changed): cities, methods and dates checked:

## Screenshots

<!-- Before/after at phone width for any visual change. Attach images here, not links to private pages. -->

## Risks and follow-ups

<!-- Anything not done, not tested (e.g. real iPhone), or that the reviewer should look at closely. -->
