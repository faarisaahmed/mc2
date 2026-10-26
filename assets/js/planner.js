/* MasjidHub AI Day Planner (demo engine).
   Reads a schedule written in everyday words, places each prayer in the first free
   moment inside its time window, and suggests events that fit the gaps and the
   person's profile. It runs entirely in the browser, so no API key is needed. */
(function () {
  "use strict";
  const M = 60000;
  const TIME = "(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?";
  const T_OR_WORD = `(?:${TIME}|noon|midnight)`;
  const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, half: 0.5 };

  function hhmm(day, mins) { const d = new Date(day); d.setHours(0, 0, 0, 0); return new Date(d.getTime() + mins * M); }
  function minsOf(d) { return d.getHours() * 60 + d.getMinutes(); }

  // Convert one matched time to minutes after midnight, guessing am/pm the way people talk.
  function toMins(h, m, ap, word, hintPm) {
    if (word === "noon") return 720;
    if (word === "midnight") return 1440;
    h = +h; m = +(m || 0);
    if (ap) { const pm = /p/i.test(ap); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    else if (h < 12 && (hintPm || h <= 6)) h += 12;
    return h * 60 + m;
  }
  function parseTok(str, hintPm) {
    const s = str.trim().toLowerCase();
    if (s === "noon" || s === "midnight") return { mins: toMins(0, 0, null, s), explicit: true };
    const m = s.match(new RegExp("^" + TIME + "$", "i"));
    if (!m) return null;
    return { mins: toMins(m[1], m[2], m[3], null, hintPm), explicit: !!m[3], h: +m[1], m: +(m[2] || 0), ap: m[3] };
  }

  function cleanLabel(s) {
    s = s.replace(/\b(i\s+have|i've\s+got|i\s+got|i'm\s+at|i\s+am\s+at|i\s+go\s+to|go\s+to|going\s+to|then|and|also|my|from|at|around|by|until|till|til|to|in\s+the|for)\b/gi, " ")
      .replace(/[@\-–]/g, " ").replace(/\s+/g, " ").trim();
    s = s.replace(/^(the|a)\s+/i, "");
    return s ? s[0].toUpperCase() + s.slice(1) : "";
  }

  // Split free text into activity blocks [{label, start, end, kind}]
  function parseSchedule(text, day, t) {
    const frags = text.split(/\n|,|;|\.(?!\d)|\bthen\b|\band then\b|\band\b(?=\s+(?:\w+\s+){0,4}(?:at|from|\d))/i).map(s => s.trim()).filter(Boolean);
    const blocks = [], notes = [];
    let wake = null, sleep = null, lastStart = null;

    frags.forEach(raw => {
      let f = raw, lower = raw.toLowerCase();
      const hintPm = /\b(evening|night|tonight|after work|after school|dinner|supper|pm)\b/.test(lower);
      let start = null, end = null, dur = null, after = null, before = null;

      const durM = lower.match(/\bfor\s+(\d+(?:\.\d+)?|an?|one|two|three|four|half)\s*(?:an?\s+)?(hours?|hrs?|h|minutes?|mins?|m)\b/);
      if (durM) { const n = NUM[durM[1]] != null ? NUM[durM[1]] : parseFloat(durM[1]); dur = /^h/.test(durM[2]) ? n * 60 : n; f = f.replace(new RegExp(durM[0], "i"), " "); }

      const range = f.match(new RegExp(`(?:from\\s+)?(${T_OR_WORD})\\s*(?:-|–|to|till|until|til)\\s*(${T_OR_WORD})`, "i"));
      if (range) {
        const endTok = parseTok(range[5], hintPm), startTok = parseTok(range[1], hintPm);
        if (startTok && endTok) {
          let s = startTok.mins, e = endTok.mins;
          const both = tok => tok.h == null ? [tok.mins] : [(tok.h % 12) * 60 + tok.m, (tok.h % 12 + 12) * 60 + tok.m];
          // "2-5pm" -> 2pm; "9-5pm" -> 9am: the latest reading of the start that's still before the end.
          if (!startTok.explicit && endTok.explicit && startTok.h != null) s = both(startTok).filter(x => x < e).pop() ?? s;
          // "8 to 3" -> 3pm: the first reading of the end that's after the start.
          if (!endTok.explicit && endTok.h != null) e = both(endTok).find(x => x > s) ?? e + 720;
          if (e <= s) e += 720;
          // People list their day in order, so "work 9-5, class 7 to 9" means 7pm.
          if (!startTok.explicit && startTok.h != null && startTok.h < 12 && lastStart != null && s < lastStart && s + 720 > lastStart) { s += 720; e += 720; }
          start = s; end = e;
          f = f.replace(range[0], " ");
        }
      }
      if (start == null) {
        const at = f.match(new RegExp(`(?:\\bat\\b|@|\\baround\\b|\\bby\\b)\\s*(${T_OR_WORD})`, "i")) || f.match(new RegExp(`(\\b\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|\\b\\d{1,2}:\\d{2}\\b|\\bnoon\\b)`, "i"));
        if (at) { const tok = parseTok(at[1], hintPm); if (tok) {
          start = tok.mins;
          // Same idea for one time: "dinner at 7:30" after a 9-to-5 is the evening.
          if (!tok.explicit && tok.h != null && tok.h < 12 && lastStart != null && start < lastStart && start + 720 > lastStart) start += 720;
          f = f.replace(at[0], " ");
        } }
      }
      const afterM = lower.match(/\bafter\s+(dinner|lunch|breakfast|school|work|class|practice|fajr|dhuhr|zuhr|asr|maghrib|isha)\b/);
      const beforeM = lower.match(/\bbefore\s+(dinner|lunch|school|work|fajr|dhuhr|zuhr|asr|maghrib|isha)\b/);
      if (afterM) { after = afterM[1].replace("zuhr", "dhuhr"); f = f.replace(new RegExp("after\\s+" + afterM[1], "i"), " "); }
      if (beforeM) { before = beforeM[1].replace("zuhr", "dhuhr"); f = f.replace(new RegExp("before\\s+" + beforeM[1], "i"), " "); }

      // Wake / sleep markers
      if (/\b(wake|get up|woke)\b/.test(lower)) { if (start != null) wake = start; return; }
      if (/\b(sleep|bed|bedtime)\b/.test(lower) && !/\bnap\b/.test(lower)) { if (start != null) sleep = start < 300 ? start + 1440 : start < 720 && !/a\.?m/i.test(lower) ? start + 720 : start; else sleep = 22 * 60 + 30; return; }

      // Part-of-day words
      if (start == null && !after && !before) {
        if (/\bmorning\b/.test(lower)) start = 9 * 60;
        else if (/\bafternoon\b/.test(lower)) start = 14 * 60;
        else if (/\bevening\b/.test(lower)) start = 18 * 60 + 30;
        else if (/\b(tonight|night)\b/.test(lower)) start = 20 * 60;
      }
      f = f.replace(/\b(morning|afternoon|evening|tonight|night|today)\b/gi, " ");

      let label = cleanLabel(f);
      const meal = /\bdinner\b/.test(lower) ? "dinner" : /\blunch\b/.test(lower) ? "lunch" : /\bbreakfast\b/.test(lower) ? "breakfast" : null;
      if (!label && meal) label = meal[0].toUpperCase() + meal.slice(1);
      if (!label) label = "Busy";

      if (start == null && !after && !before && meal) {
        if (meal === "dinner") { start = minsOf(t.maghrib) + 15; dur = dur || 45; notes.push({ ic: "info", t: "Dinner placed right after Maghrib." }); }
        if (meal === "lunch") { start = 12 * 60; dur = dur || 30; }
        if (meal === "breakfast") { start = 7 * 60 + 15; dur = dur || 30; }
      }
      if (start != null) lastStart = start;
      blocks.push({ label, start, end, dur, after, before, kind: "busy", raw });
    });

    // Resolve relative blocks ("homework after dinner") now that anchors exist.
    const prayerMins = k => minsOf(t[k]);
    for (let pass = 0; pass < 3; pass++) {
      blocks.forEach(b => {
        if (b.start != null) return;
        if (b.after) {
          const anchor = ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(b.after) ? { end: prayerMins(b.after) + 15 } : blocks.find(x => x !== b && x.start != null && x.label.toLowerCase().includes(b.after));
          const MEAL_END = { breakfast: 7 * 60 + 45, lunch: 12 * 60 + 30, dinner: prayerMins("maghrib") + 60 };
          if (anchor) b.start = anchor.end != null ? anchor.end : anchor.start + (anchor.dur || 60);
          else if (pass === 2 && MEAL_END[b.after]) b.start = MEAL_END[b.after];
        } else if (b.before) {
          const anchor = ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(b.before) ? { start: prayerMins(b.before) } : blocks.find(x => x !== b && x.start != null && x.label.toLowerCase().includes(b.before));
          if (anchor) b.start = anchor.start - (b.dur || 60);
        }
      });
    }
    const unplaced = [];
    const out = blocks.filter(b => {
      if (b.start == null) { unplaced.push(b.raw); return false; }
      if (b.end == null) b.end = b.start + (b.dur || 60);
      return true;
    }).map(b => ({ label: b.label, start: hhmm(day, b.start), end: hhmm(day, b.end), kind: "busy", raw: b.raw }));
    if (unplaced.length) notes.push({ ic: "info", t: `I couldn't find a time for: “${unplaced.join("”, “")}”. Try adding a time, like “at 4pm”.` });
    return { blocks: out.sort((a, b) => a.start - b.start), wake: wake != null ? hhmm(day, wake) : null, sleep: sleep != null ? hhmm(day, sleep) : null, notes };
  }

  function overlaps(a, b) { return a.start < b.end && b.start < a.end; }

  // Prayer windows: each prayer may be prayed from its adhan until the next boundary.
  function windows(day, t) {
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const tn = MH.todayTimes(next);
    const midnight = new Date(t.maghrib.getTime() + (tn.fajr - t.maghrib) / 2);
    return [
      { id: "fajr", t: "Fajr", start: t.fajr, end: t.sunrise, endLabel: "sunrise" },
      { id: "dhuhr", t: day.getDay() === 5 ? "Dhuhr / Jumu'ah" : "Dhuhr", start: t.dhuhr, end: t.asr, endLabel: "Asr" },
      { id: "asr", t: "Asr", start: t.asr, end: new Date(t.maghrib.getTime() - 10 * M), endLabel: "just before sunset" },
      { id: "maghrib", t: "Maghrib", start: t.maghrib, end: t.isha, endLabel: "Isha" },
      { id: "isha", t: "Isha", start: t.isha, end: midnight, endLabel: "midnight" }
    ];
  }

  function plan(text, day, opts) {
    opts = opts || {};
    const t = MH.todayTimes(day);
    const parsed = parseSchedule(text, day, t);
    const busy = parsed.blocks;
    const items = busy.map(b => Object.assign({}, b));
    const notes = parsed.notes.slice();
    let fit = 0;

    windows(day, t).forEach(w => {
      const dur = w.id === "dhuhr" && day.getDay() === 5 ? 50 : 10;
      let c = new Date(w.start), placed = null, guard = 0;
      while (c.getTime() + dur * M <= w.end.getTime() && guard++ < 50) {
        const slot = { start: c, end: new Date(c.getTime() + dur * M) };
        const clash = busy.filter(b => overlaps(b, slot)).sort((a, b) => b.end - a.end)[0];
        if (!clash) { placed = slot; break; }
        c = new Date(clash.end);
      }
      if (placed) {
        fit++;
        const delayed = Math.round((placed.start - w.start) / M);
        const before = busy.filter(b => b.end <= placed.start && b.end > w.start).pop();
        items.push({ kind: "prayer", label: w.t, start: placed.start, end: placed.end,
          why: delayed > 2 ? `Right after ${before ? before.label.toLowerCase() : "your last activity"}. You have until ${w.endLabel} (${MH.fmtTime(w.end)}).` : `At the adhan, ${MH.fmtTime(w.start)}. Window ends at ${w.endLabel}.` });
        if (w.id === "fajr" && parsed.wake && parsed.wake > w.start) notes.push({ ic: "alert", t: `You wake at ${MH.fmtTime(parsed.wake)}, but Fajr ends at sunrise (${MH.fmtTime(t.sunrise)}). Set an alarm for ${MH.fmtTime(w.start)}, then you can rest again.` });
        if (w.id === "isha" && parsed.sleep && placed.start > parsed.sleep) notes.push({ ic: "info", t: `Pray Isha before bed. It starts at ${MH.fmtTime(w.start)}.` });
      } else {
        const cover = busy.find(b => overlaps(b, { start: w.start, end: w.end })) || busy[0];
        const mid = new Date(Math.max(w.start, cover.start));
        items.push({ kind: "prayer", conflict: true, label: w.t, start: mid, end: new Date(mid.getTime() + 10 * M),
          why: `${cover.label} covers the whole ${w.t} window (${MH.fmtTime(w.start)}–${MH.fmtTime(w.end)}). Ask for a 10-minute break, and look for a quiet room or a clean spot.` });
        notes.push({ ic: "alert", t: `${w.t} overlaps ${cover.label.toLowerCase()} the whole time. Plan a short break.` });
      }
    });

    // Event suggestions
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const evs = MH.occurrences(dayStart, dayEnd).filter(e => MH.fitsAudience(e)).map(e => Object.assign(e, { score: MH.matchScore(e) }));
    const taken = items.filter(i => i.kind !== "prayer").slice();
    const picked = [];
    const forced = opts.addKey ? evs.find(e => e.key === opts.addKey) : null;
    if (forced) {
      const clash = taken.find(b => overlaps(b, forced));
      picked.push(Object.assign({}, forced, { why: clash ? `You asked for this. Heads up: it overlaps ${clash.label.toLowerCase()}.` : "You picked this one. It fits your day." }));
      taken.push(forced);
    }
    evs.filter(e => e !== forced && e.score >= 55 && e.start > new Date(Date.now() - 30 * M))
      .sort((a, b) => b.score - a.score)
      .forEach(e => {
        if (picked.length >= 3) return;
        const buffered = { start: new Date(e.start - 20 * M), end: new Date(e.end.getTime() + 20 * M) };
        if (taken.some(b => overlaps(b, buffered))) return;
        if (parsed.sleep && e.end > parsed.sleep) return;
        const likes = (MH.prefs.interests || []).filter(i => e.interests.includes(i)).map(MH.interestName);
        picked.push(Object.assign({}, e, { why: `${likes.length ? "Matches your interest in " + likes.join(" & ") + ". " : ""}${MH.ageLabel(e)}. You're free then, with time to get there.` }));
        taken.push(e);
      });
    picked.forEach(e => items.push({ kind: "event", label: e.title, start: e.start, end: e.end, why: e.why, key: e.key, place: e.place }));

    items.sort((a, b) => a.start - b.start || (a.kind === "prayer" ? -1 : 1));
    if (parsed.sleep) items.push({ kind: "free", label: "Sleep", start: parsed.sleep, end: parsed.sleep, why: "Rest well. The Prophet ﷺ disliked sleeping before Isha and talking late after it (Sahih al-Bukhari 568)." });

    const summary = [];
    summary.push(fit === 5 ? { ic: "check", t: "All five prayers fit into your day." } : { ic: "alert", t: `${fit} of 5 prayers fit on their own. See the notes below.` });
    if (day.getDay() === 5) summary.push({ ic: "mosque", t: "It's Friday. Jumu'ah replaces Dhuhr, so I set aside 50 minutes for the khutbah and prayer." });
    if (picked.length) summary.push({ ic: "sparkle", t: `I found ${picked.length} event${picked.length > 1 ? "s" : ""} that fit your free time${MH.prefs.age || MH.prefs.interests.length ? " and your profile" : ""}.` });
    else summary.push({ ic: "info", t: MH.prefs.age || MH.prefs.interests.length ? "No events fit your free time today. Try another day." : "Tip: tap Personalize to add your age and interests, and I'll suggest events." });
    return { items, notes: summary.concat(notes), times: t };
  }

  window.MHPlanner = { plan, parseSchedule };
})();
