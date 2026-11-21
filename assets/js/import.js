/* Event import for the mosque dashboard (admin.html, Events tab). Loaded only there.
   Turns a calendar file (.ics, from Google Calendar, Outlook or Apple Calendar) or spreadsheet rows (.csv, or rows
   pasted from Excel or Google Sheets) into events in the same shape as data.js, for the admin to check before saving.
   Everything runs in the browser; nothing is uploaded until the admin presses Add.
   Each result: { ev, warn: [..], error: "" }. ev has title, desc, place, cost, date | recur, start, end, sample. */
(function () {
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const clip = (s, n) => (s || "").trim().slice(0, n);
  const addMins = (t, m) => { const [h, mm] = t.split(":").map(Number), x = Math.min(23 * 60 + 59, h * 60 + mm + m); return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
  const PLACEHOLDER = ["09:00", "17:00"];   // for events with no time; they're marked "time not confirmed"

  /* ---------- Spreadsheets ---------- */
  function parseCsv(text) {
    const first = text.split(/\r?\n/)[0] || "";
    const sep = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"' && cell === "") q = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
  }

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  function parseDate(s) {
    s = (s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return valid(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);   // US order: month/day/year
    if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
    m = s.toLowerCase().match(/^(?:[a-z]+,?\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);   // "Dec 5, 2026", "Saturday, December 5 2026"
    if (m && MONTHS.includes(m[1])) return valid(+m[3], MONTHS.indexOf(m[1]) + 1, +m[2]);
    return "";
  }
  function valid(y, mo, d) {
    const x = new Date(y, mo - 1, d);
    return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d ? ymd(x) : "";
  }
  function parseTime(s) {
    s = (s || "").trim().toLowerCase().replace(/\./g, "");
    if (s === "noon") return "12:00";
    if (s === "midnight") return "00:00";
    const m = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm|a|p)?$/);
    if (!m) return "";
    let h = +m[1]; const min = +(m[2] || 0), ap = m[3];
    if (ap) { if (h < 1 || h > 12) return ""; if (ap[0] === "p" && h < 12) h += 12; if (ap[0] === "a" && h === 12) h = 0; }
    return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : "";
  }

  const COLS = [["title", /^(title|name|event|event name|what)$/], ["date", /^(date|day|when|start date)$/], ["start", /^(start|starts|start time|time|from|begins)$/],
                ["end", /^(end|ends|end time|to|until|finish)$/], ["place", /^(place|location|where|room|venue)$/], ["desc", /^(description|desc|details|about|notes)$/],
                ["cost", /^(cost|price|fee|registration|tickets?)$/]];
  const ORDER = ["title", "date", "start", "end", "place", "desc", "cost"];

  function fromRows(text) {
    const rows = parseCsv(text);
    if (!rows.length) return [];
    let map = ORDER;
    const head = rows[0].map(h => h.toLowerCase());
    if (head.some(h => COLS.some(([, re]) => re.test(h))) && !parseDate(rows[0][1] || "")) {
      map = head.map(h => (COLS.find(([, re]) => re.test(h)) || [null])[0]);
      rows.shift();
    }
    return rows.map(r => {
      const v = {}; map.forEach((k, i) => { if (k && r[i] != null && v[k] == null) v[k] = r[i]; });
      // "7:00 PM - 8:30 PM" in one cell
      if (v.start && !v.end && /[-–]/.test(v.start)) { const [a, b] = v.start.split(/\s*[-–]\s*/); v.start = a; v.end = b; }
      const out = { ev: { title: clip(v.title, 140), desc: clip(v.desc, 2000), place: clip(v.place, 200), cost: clip(v.cost, 200) }, warn: [], error: "" };
      if (!out.ev.title) out.error = "No title";
      const date = parseDate(v.date);
      if (!date) out.error = out.error || (v.date ? `Can't read the date "${v.date}". Use 2026-12-05 or 12/5/2026.` : "No date");
      out.ev.date = date;
      timesInto(out, parseTime(v.start), parseTime(v.end), v.start);
      return out;
    });
  }

  function timesInto(out, start, end, rawStart) {
    if (!start) {
      [out.ev.start, out.ev.end] = PLACEHOLDER; out.ev.sample = true;
      out.warn.push(rawStart ? `Can't read the time "${rawStart}", so it's marked "time not confirmed". Fix it after importing.` : "No time given, so it's marked \"time not confirmed\". Add the time after importing.");
      return;
    }
    out.ev.start = start;
    if (!end || end <= start) { out.ev.end = addMins(start, 90); out.warn.push("No end time, so it's set to 90 minutes."); }
    else out.ev.end = end;
  }

  /* ---------- Calendar files (.ics) ---------- */
  const unesc = s => (s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
  function icsDate(v, params) {
    const m = (v || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(params)) return { day: new Date(+m[1], +m[2] - 1, +m[3]), allDay: true };
    // UTC times become this computer's local time. Times with a TZID are read as written (the mosque's own zone).
    const d = m[7] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    return { day: d, allDay: false };
  }
  const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  function fromIcs(text) {
    const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    const raw = []; let cur = null;
    for (const line of lines) {
      if (line === "BEGIN:VEVENT") { cur = {}; continue; }
      if (line === "END:VEVENT") { if (cur) raw.push(cur); cur = null; continue; }
      if (!cur) continue;
      const i = line.indexOf(":"); if (i < 0) continue;
      const left = line.slice(0, i), name = left.split(";")[0].toUpperCase();
      if (!(name in cur)) cur[name] = { v: line.slice(i + 1), p: left.slice(name.length) };
    }
    const today = ymd(new Date());
    const out = [];
    let past = 0;
    raw.forEach(r => {
      if ((r.STATUS && r.STATUS.v === "CANCELLED") || r["RECURRENCE-ID"]) return;   // one changed date of a series: the series covers it
      const s = r.DTSTART && icsDate(r.DTSTART.v, r.DTSTART.p), en = r.DTEND && icsDate(r.DTEND.v, r.DTEND.p);
      const res = { ev: { title: clip(unesc(r.SUMMARY && r.SUMMARY.v), 140), desc: clip(unesc(r.DESCRIPTION && r.DESCRIPTION.v), 2000), place: clip(unesc(r.LOCATION && r.LOCATION.v), 200), cost: "" }, warn: [], error: "" };
      if (!res.ev.title) res.error = "No title";
      if (!s) { res.error = res.error || "No start date"; out.push(res); return; }
      const first = ymd(s.day);
      if (s.allDay) timesInto(res, "", "", "");
      else {
        const overnight = en && !en.allDay && ymd(en.day) !== first;
        timesInto(res, hm(s.day), overnight ? "23:59" : en && !en.allDay ? hm(en.day) : "", "");
        if (overnight) res.warn.push("Runs past midnight, so it's shown ending at 11:59 PM.");
      }
      let last = first;
      if (r.RRULE) {
        const rule = {}; r.RRULE.v.split(";").forEach(kv => { const [k, v] = kv.split("="); rule[k] = v; });
        const every = +(rule.INTERVAL || 1);
        let days = null;
        if (rule.FREQ === "WEEKLY" && every <= 2) days = rule.BYDAY ? rule.BYDAY.split(",").map(x => BYDAY[x.slice(-2)]).filter(x => x != null) : [s.day.getDay()];
        if (rule.FREQ === "DAILY" && every === 1) days = [0, 1, 2, 3, 4, 5, 6];
        if (days && days.length) {
          let to;
          if (rule.UNTIL) { const u = rule.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/); to = u ? `${u[1]}-${u[2]}-${u[3]}` : ""; }   // the last day, as written
          else if (rule.COUNT) {
            let n = +rule.COUNT; const d = new Date(s.day);
            const start = new Date(s.day.getFullYear(), s.day.getMonth(), s.day.getDate());
            for (let guard = 0; n > 0 && guard < 3000; guard++) {
              const wk = Math.floor(Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000) / 7);
              if (days.includes(d.getDay()) && wk % every === 0) { n--; to = ymd(d); }
              if (n > 0) d.setDate(d.getDate() + 1);
            }
          }
          if (!to) { const d = new Date(s.day); d.setFullYear(d.getFullYear() + 1); to = ymd(d); res.warn.push("Repeats with no end date, so it's set to one year. Change the end date if you need to."); }
          delete res.ev.date;
          res.ev.recur = { days: [...new Set(days)].sort(), from: first, to, every };
          last = to;
          if (r.EXDATE) res.warn.push("Your calendar skips some dates of this series. Those skips aren't brought over.");
        } else {
          res.ev.date = first;
          res.warn.push(`Repeats ${({ MONTHLY: "monthly", YEARLY: "yearly", DAILY: "every few days", WEEKLY: "every few weeks" })[rule.FREQ] || "in a pattern"} in your calendar. Only the first date is brought over; add the others by hand.`);
        }
      } else res.ev.date = first;
      if (last < today) { past++; return; }
      out.push(res);
    });
    out.past = past;
    return out;
  }

  function parse(text, filename) {
    const isIcs = /\.ics$/i.test(filename || "") || /BEGIN:VCALENDAR/.test(text.slice(0, 2000));
    const list = isIcs ? fromIcs(text) : fromRows(text);
    if (!isIcs) { const today = ymd(new Date()); const keep = list.filter(x => !x.ev.date || x.ev.date >= today); keep.past = list.length - keep.length; return keep; }
    return list;
  }

  const TEMPLATE = "Title,Date,Start,End,Place,Description,Cost\n" +
    "Family Night,2026-12-05,6:30 PM,8:30 PM,Main hall,Dinner and a short talk for the whole family.,Free\n" +
    "Youth Basketball,12/12/2026,11:00 AM,1:00 PM,Gym,Ages 10 to 16.,$5\n";

  window.MH_IMPORT = { parse, TEMPLATE, parseDate, parseTime };
})();
