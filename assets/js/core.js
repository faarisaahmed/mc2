/* MasjidHub core: preferences, prayer-time math, Hijri dates, Qibla, events, and shared page chrome.
   No build step and no API keys. Everything runs in the browser. */
(function () {
  "use strict";

  /* ---------------- Storage (fails quietly in private mode) ---------------- */
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem("mh:" + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem("mh:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------------- Preferences ---------------- */
  const DEFAULT_LOC = { lat: 40.2813, lng: -74.5704, name: "West Windsor, NJ", source: "default" };
  const PREFS_VERSION = 2;
  const DEFAULT_PREFS = {
    v: PREFS_VERSION,
    loc: DEFAULT_LOC,
    method: "ISNA",        // calculation method key, see METHODS
    asr: "hanafi",         // "hanafi" (default) or "standard" (Shafi'i, Maliki, Hanbali)
    age: null,             // ageGroups id
    gender: "any",         // any | male | female
    interests: [],
    text: "md",            // md | lg | xl
    theme: "auto",         // auto (follow the device) | light | dark
    hijriAdj: 0,           // -2..+2 days, to match local moon sighting
    clock: "12",           // 12 | 24
    onboarded: false
  };
  const saved = store.get("prefs", {});
  // v2 made Hanafi the default Asr. Earlier visitors never chose it on purpose, so move them over once.
  if (saved.v !== PREFS_VERSION) { saved.asr = "hanafi"; saved.v = PREFS_VERSION; }
  let prefs = Object.assign({}, DEFAULT_PREFS, saved);
  const listeners = [];
  function setPrefs(patch) {
    prefs = Object.assign({}, prefs, patch);
    store.set("prefs", prefs);
    applyDisplay();
    listeners.forEach(fn => { try { fn(prefs); } catch (e) { console.error(e); } });
  }
  function onPrefs(fn) { listeners.push(fn); }
  function applyDisplay() {
    const h = document.documentElement;
    h.classList.toggle("text-lg", prefs.text === "lg");
    h.classList.toggle("text-xl", prefs.text === "xl");
    if (prefs.theme === "light" || prefs.theme === "dark") h.setAttribute("data-theme", prefs.theme);
    else h.removeAttribute("data-theme");
  }
  applyDisplay();

  /* ---------------- Prayer times ----------------
     Standard astronomical method (sun declination + equation of time),
     the same formulas used by most prayer apps. Fajr/Isha use twilight angles
     from the chosen authority; Asr uses shadow length 1 (standard) or 2 (Hanafi). */
  const METHODS = {
    ISNA:    { t: "ISNA (North America)",            fajr: 15,   isha: 15 },
    MWL:     { t: "Muslim World League",             fajr: 18,   isha: 17 },
    Egypt:   { t: "Egyptian General Authority",      fajr: 19.5, isha: 17.5 },
    Makkah:  { t: "Umm al-Qura, Makkah",             fajr: 18.5, ishaMin: 90 },
    Karachi: { t: "University of Islamic Sciences, Karachi", fajr: 18, isha: 18 },
    Tehran:  { t: "Institute of Geophysics, Tehran", fajr: 17.7, isha: 14, maghrib: 4.5 },
    Jafari:  { t: "Shia Ithna-Ashari (Jafari)",      fajr: 16,   isha: 14, maghrib: 4 }
  };
  const PRAYERS = [
    { id: "fajr", t: "Fajr", ar: "الفجر" },
    { id: "sunrise", t: "Sunrise", ar: "الشروق", notPrayer: true },
    { id: "dhuhr", t: "Dhuhr", ar: "الظهر" },
    { id: "asr", t: "Asr", ar: "العصر" },
    { id: "maghrib", t: "Maghrib", ar: "المغرب" },
    { id: "isha", t: "Isha", ar: "العشاء" }
  ];

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const dsin = d => Math.sin(d * D2R), dcos = d => Math.cos(d * D2R), dtan = d => Math.tan(d * D2R);
  const darcsin = x => R2D * Math.asin(x), darccos = x => R2D * Math.acos(x);
  const darctan2 = (y, x) => R2D * Math.atan2(y, x), darccot = x => R2D * Math.atan(1 / x);
  const fixAngle = a => { a = a - 360 * Math.floor(a / 360); return a < 0 ? a + 360 : a; };
  const fixHour = a => { a = a - 24 * Math.floor(a / 24); return a < 0 ? a + 24 : a; };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fixAngle(357.529 + 0.98560028 * D);
    const q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    return { decl: darcsin(dsin(e) * dsin(L)), eqt: q / 15 - fixHour(RA) };
  }

  // Returns Date objects for the given calendar day at (lat, lng).
  function prayerTimes(date, lat, lng, opts) {
    opts = opts || prefs;
    const m = METHODS[opts.method] || METHODS.ISNA;
    const asrFactor = opts.asr === "hanafi" ? 2 : 1;
    const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    const jDate = julian(y, mo, d) - lng / (15 * 24);

    const midDay = t => fixHour(12 - sunPosition(jDate + t).eqt);
    const sunAngleTime = (angle, t, ccw) => {
      const decl = sunPosition(jDate + t).decl;
      const T = darccos((-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat))) / 15;
      return midDay(t) + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const decl = sunPosition(jDate + t).decl;
      return sunAngleTime(-darccot(factor + dtan(Math.abs(lat - decl))), t);
    };

    // Single pass from standard starting estimates, matching the PrayTimes/Aladhan reference.
    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };
    for (let i = 0; i < 1; i++) {
      const p = {}; for (const k in t) p[k] = t[k] / 24;
      t = {
        fajr: sunAngleTime(m.fajr, p.fajr, true),
        sunrise: sunAngleTime(0.833, p.sunrise, true),
        dhuhr: midDay(p.dhuhr),
        asr: asrTime(asrFactor, p.asr),
        sunset: sunAngleTime(0.833, p.sunset),
        maghrib: m.maghrib ? sunAngleTime(m.maghrib, p.maghrib) : sunAngleTime(0.833, p.sunset),
        isha: m.ishaMin ? NaN : sunAngleTime(m.isha, p.isha)
      };
      if (m.ishaMin) t.isha = t.maghrib + m.ishaMin / 60;
    }

    // High latitudes: when twilight never reaches the angle, use the angle-based night portion.
    const night = fixHour(t.sunrise - t.sunset);
    if (!isFinite(t.fajr) || fixHour(t.sunrise - t.fajr) > (m.fajr / 60) * night) t.fajr = t.sunrise - (m.fajr / 60) * night;
    if (m.maghrib && (!isFinite(t.maghrib) || fixHour(t.maghrib - t.sunset) > (m.maghrib / 60) * night)) t.maghrib = t.sunset + (m.maghrib / 60) * night;
    if (!m.ishaMin && (!isFinite(t.isha) || fixHour(t.isha - t.sunset) > (m.isha / 60) * night)) t.isha = t.sunset + (m.isha / 60) * night;

    const base = Date.UTC(y, mo - 1, d);
    const out = {};
    ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].forEach(k => {
      const h = t[k] - lng / 15;        // local solar time -> UTC hours
      out[k] = new Date(Math.round((base + h * 3600000) / 60000) * 60000);
    });
    out.sunset = out.maghrib;
    return out;
  }
  function todayTimes(d) { return prayerTimes(d || new Date(), prefs.loc.lat, prefs.loc.lng); }

  // Next prayer (skips sunrise). Returns {id, t, ar, time, prevTime}.
  function nextPrayer(now) {
    now = now || new Date();
    const today = todayTimes(now);
    const order = PRAYERS.filter(p => !p.notPrayer);
    for (let i = 0; i < order.length; i++) {
      if (today[order[i].id] > now) return Object.assign({}, order[i], { time: today[order[i].id] });
    }
    const tm = new Date(now); tm.setDate(tm.getDate() + 1);
    return Object.assign({}, order[0], { time: todayTimes(tm).fajr, tomorrow: true });
  }

  /* ---------------- Formatting ---------------- */
  function fmtTime(d) {
    if (!d || isNaN(d)) return "--:--";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: prefs.clock !== "24" });
  }
  function fmtDate(d, o) { return d.toLocaleDateString([], o || { weekday: "long", month: "long", day: "numeric" }); }
  function fmtCountdown(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(sec).padStart(2, "0")}s`;
  }
  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function parseYmd(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  /* ---------------- Hijri calendar ----------------
     Uses the browser's built-in Umm al-Qura calendar. Local moon sighting can
     differ by a day, so the user can shift it in Settings. */
  const HIJRI_MONTHS = ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'dah", "Dhu al-Hijjah"];
  const HIJRI_MONTHS_AR = ["مُحَرَّم", "صَفَر", "رَبِيع الأوَّل", "رَبِيع الثاني", "جُمادى الأولى", "جُمادى الآخرة", "رَجَب", "شَعْبان", "رَمَضان", "شَوّال", "ذو القعدة", "ذو الحجة"];
  let hijriFmt = null;
  try { hijriFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }); } catch (e) { /* old browser */ }
  function hijri(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + (prefs.hijriAdj || 0), 12));
    if (hijriFmt) {
      const parts = hijriFmt.formatToParts(d), get = t => parseInt((parts.find(p => p.type === t) || {}).value, 10);
      const day = get("day"), month = get("month"), year = get("year");
      if (day && month && year) return { day, month, year, name: HIJRI_MONTHS[month - 1], ar: HIJRI_MONTHS_AR[month - 1] };
    }
    return kuwaitiHijri(d);
  }
  // Arithmetic (tabular) fallback for browsers without the Umm al-Qura calendar.
  function kuwaitiHijri(d) {
    const jd = Math.floor(d.getTime() / 86400000) + 2440588;
    const l0 = jd - 1948440 + 10632, n = Math.floor((l0 - 1) / 10631);
    let l = l0 - 10631 * n + 354;
    const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l) / 709), day = l - Math.floor((709 * month) / 24), year = 30 * n + j - 30;
    return { day, month, year, name: HIJRI_MONTHS[month - 1], ar: HIJRI_MONTHS_AR[month - 1] };
  }
  function fmtHijri(d) { const h = hijri(d); return `${h.day} ${h.name} ${h.year} AH`; }

  const ISLAMIC_DAYS = [
    { m: 1, d: 1, t: "Islamic New Year", info: "The first day of Muharram begins the new Hijri year." },
    { m: 1, d: 10, t: "Day of Ashura", info: "Fasting this day (with the 9th or 11th) is a recommended sunnah." },
    { m: 3, d: 12, t: "Mawlid an-Nabi", info: "Observed by many Muslims as the Prophet's ﷺ birthday." },
    { m: 7, d: 27, t: "Isra' and Mi'raj", info: "Commemorates the Night Journey (commonly marked on 27 Rajab)." },
    { m: 8, d: 15, t: "Mid-Sha'ban", info: "Laylat al-Bara'ah, observed by many with night prayer." },
    { m: 9, d: 1, t: "Ramadan begins", info: "First day of fasting. Confirm locally, as it depends on moon sighting." },
    { m: 9, d: 27, t: "Laylat al-Qadr (27th night)", info: "Seek it in the odd nights of the last ten of Ramadan." },
    { m: 10, d: 1, t: "Eid al-Fitr", info: "Celebration at the end of Ramadan. Confirm locally." },
    { m: 12, d: 8, t: "Hajj begins", info: "Day of Tarwiyah, when pilgrims head to Mina." },
    { m: 12, d: 9, t: "Day of Arafah", info: "Fasting this day is highly recommended for those not on Hajj." },
    { m: 12, d: 10, t: "Eid al-Adha", info: "Festival of Sacrifice. Confirm locally." }
  ];
  function islamicDay(date) {
    const h = hijri(date);
    return ISLAMIC_DAYS.find(x => x.m === h.month && x.d === h.day) || null;
  }
  function upcomingIslamicDays(from, count) {
    const out = [], d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 0; i < 400 && out.length < (count || 6); i++) {
      const hit = islamicDay(d);
      if (hit) out.push(Object.assign({ date: new Date(d) }, hit));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  /* ---------------- Qibla ---------------- */
  const KAABA = { lat: 21.422487, lng: 39.826206 };
  function qiblaBearing(lat, lng) {
    const p1 = lat * D2R, p2 = KAABA.lat * D2R, dl = (KAABA.lng - lng) * D2R;
    const y = Math.sin(dl), x = Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl);
    return (Math.atan2(y, x) * R2D + 360) % 360;
  }
  function distanceKm(a, b) {
    const R = 6371, dLat = (b.lat - a.lat) * D2R, dLng = (b.lng - a.lng) * D2R;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDistance(km) { const mi = km * 0.621371; return mi < 0.2 ? `${Math.round(mi * 5280)} ft` : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`; }
  function compassWord(b) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(b / 45) % 8]; }

  /* ---------------- Location ---------------- */
  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Location isn't available in this browser."));
      navigator.geolocation.getCurrentPosition(async pos => {
        const loc = { lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4), name: "Your location", source: "gps" };
        try { loc.name = await reverseName(loc.lat, loc.lng) || loc.name; } catch (e) { /* keep generic */ }
        resolve(loc);
      }, err => reject(new Error(err.code === 1 ? "Location sharing is turned off for this site. No problem: type your city or zip code below instead." : "We couldn't find your location. Please type your city or zip code below.")), { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  }
  async function reverseName(lat, lng) {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": navigator.language || "en" } });
    const j = await r.json(), a = j.address || {};
    const city = a.city || a.town || a.village || a.suburb || a.county;
    const region = a.state_code || (a["ISO3166-2-lvl4"] || "").split("-")[1] || a.state || a.country;
    return [city, region].filter(Boolean).join(", ");
  }
  async function searchPlace(q) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": navigator.language || "en" } });
    const j = await r.json();
    return j.map(x => {
      const a = x.address || {};
      const city = a.city || a.town || a.village || a.hamlet || a.suburb || x.name;
      const region = (a["ISO3166-2-lvl4"] || "").split("-")[1] || a.state || "";
      return { lat: +(+x.lat).toFixed(4), lng: +(+x.lon).toFixed(4), name: [city, region || a.country].filter(Boolean).join(", "), full: x.display_name };
    });
  }

  /* ---------------- Mosques (built-in + user-submitted applications) ---------------- */
  function allMosques() {
    const apps = store.get("applications", []).map(a => Object.assign({ pending: true }, a));
    return MH_DATA.mosques.map(m => Object.assign({ hub: true }, m)).concat(apps);
  }

  /* ---------------- Events ---------------- */
  const prayerCache = {};
  function timesAt(date, mosque) {
    const key = ymd(date) + mosque.id;
    if (!prayerCache[key]) prayerCache[key] = prayerTimes(date, mosque.lat, mosque.lng, { method: "ISNA", asr: "standard" });
    return prayerCache[key];
  }
  function atTime(date, hhmm) { const [h, m] = hhmm.split(":").map(Number); const d = new Date(date); d.setHours(h, m, 0, 0); return d; }
  function roundTo5(d) { return new Date(Math.ceil(d.getTime() / 300000) * 300000); }

  // Expand one-off and recurring events into concrete occurrences between [from, to).
  function occurrences(from, to) {
    const out = [];
    const mosque = MH_DATA.mosques[0];
    MH_DATA.events.forEach(ev => {
      const days = [];
      if (ev.date) days.push(parseYmd(ev.date));
      else if (ev.recur) {
        const start = parseYmd(ev.recur.from), end = parseYmd(ev.recur.to);
        const d = new Date(Math.max(start, new Date(from.getFullYear(), from.getMonth(), from.getDate())));
        const lim = new Date(Math.min(end, to));
        while (d <= lim) {
          if (ev.recur.days.includes(d.getDay())) {
            const wk = Math.round((d - start) / (7 * 86400000));
            if (!ev.recur.every || Math.floor(wk) % ev.recur.every === 0) days.push(new Date(d));
          }
          d.setDate(d.getDate() + 1);
        }
      }
      days.forEach(day => {
        let start, end;
        if (ev.after) {
          const pt = timesAt(day, mosque)[ev.after];
          start = roundTo5(new Date(pt.getTime() + (ev.offset != null ? ev.offset : 20) * 60000));
          end = new Date(start.getTime() + ev.mins * 60000);
        } else {
          start = atTime(day, ev.start);
          end = atTime(day, ev.end);
        }
        if (end > from && start < to) out.push(Object.assign({}, ev, { start, end, key: ev.id + ymd(day), mosque }));
      });
    });
    return out.sort((a, b) => a.start - b.start);
  }
  function ageRange(groupId) { const g = MH_DATA.ageGroups.find(a => a.id === groupId); return g ? [g.min, g.max] : null; }
  function fitsAge(ev, groupId) {
    const r = ageRange(groupId); if (!r) return true;
    return ev.ages[0] <= r[1] && ev.ages[1] >= r[0];
  }
  function fitsAudience(ev, p) {
    p = p || prefs;
    if (ev.audience === "all") return true;
    if (p.gender === "male") return false;
    if (ev.audience === "girls") return !p.age || p.age === "kids" || p.age === "teens" || p.gender === "female";
    return true;
  }
  // 0-100 relevance score for the current profile.
  function matchScore(ev, p) {
    p = p || prefs;
    let s = 40;
    if (p.age) s += fitsAge(ev, p.age) ? 25 : -40;
    if (!fitsAudience(ev, p)) s -= 50;
    const hits = (p.interests || []).filter(i => ev.interests.includes(i)).length;
    if ((p.interests || []).length) s += Math.min(35, hits * 18) - (hits ? 0 : 10);
    return Math.max(0, Math.min(100, s));
  }
  function ageLabel(ev) {
    const [a, b] = ev.ages;
    if (a <= 0 && b >= 100) return "All ages";
    if (b >= 100) return `Ages ${a}+`;
    return `Ages ${a}–${b}`;
  }
  function audienceLabel(ev) { return { sisters: "Sisters", brothers: "Brothers", girls: "Girls" }[ev.audience] || ""; }
  function interestName(id) { const i = MH_DATA.interests.find(x => x.id === id); return i ? i.t : id; }

  // Simple .ics export so people can add an event to their own calendar.
  function icsFor(list) {
    const z = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MasjidHub//Demo//EN"];
    list.forEach(e => {
      lines.push("BEGIN:VEVENT", `UID:${e.key || Math.random()}@masjidhub`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(e.start)}`, `DTEND:${z(e.end)}`,
        `SUMMARY:${(e.title || "").replace(/[,;]/g, "\\$&")}`, `LOCATION:${(e.place || "").replace(/[,;]/g, "\\$&")}`, `DESCRIPTION:${(e.desc || "").replace(/[,;]/g, "\\$&")}`, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- Icons (simple line icons, no emoji) ---------------- */
  const ICONS = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    chat: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
    pin: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 4 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.8 1.4-1.7 2.8-2.8 4.8-2.8 3.2 0 5.5 2.9 4.4 6.2C19.5 15.4 12 20 12 20z"/>',
    mosque: '<path d="M12 3c-.6 1.6-4 3.1-4 6.4V12h8V9.4C16 6.1 12.6 4.6 12 3z"/><path d="M4 21v-9h16v9M2.5 21h19M10 21v-3.5a2 2 0 0 1 4 0V21M4 12V8.5M20 12V8.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
    grad: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-5M21.5 9v5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8"/>',
    flower: '<circle cx="12" cy="7.5" r="3"/><circle cx="12" cy="16.5" r="3"/><circle cx="7.5" cy="12" r="3"/><circle cx="16.5" cy="12" r="3"/><circle cx="12" cy="12" r="1.2"/>',
    hand: '<path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 10.5V4.5a1.5 1.5 0 0 1 3 0v6M13 10.5V5.5a1.5 1.5 0 0 1 3 0v6M16 10.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L4 14.6a1.6 1.6 0 0 1 2.6-1.8L7 13.5"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    phone: '<path d="M5 3.5h3.5l1.5 4.5-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2 4.5 1.5V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    flask: '<path d="M9.5 3h5M10 3v6L4.8 18.2A1.9 1.9 0 0 0 6.5 21h11a1.9 1.9 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    car: '<path d="M5 16.5V12l2-5h10l2 5v4.5M3.5 16.5h17M7 19.5v-3M17 19.5v-3"/><circle cx="7.5" cy="13.5" r=".8"/><circle cx="16.5" cy="13.5" r=".8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    text: '<path d="M4 19 9 5l5 14M5.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2"/>',
    menu: '<path d="M4 8h16M4 16h16"/>',
    home: '<path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5"/>'
  };
  function icon(name, cls) {
    return `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  /* ---------------- Page chrome ---------------- */
  const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#c8a24a"/><path d="M16 6c-1 2.3-5.5 4.2-5.5 9v9h11v-9c0-4.8-4.5-6.7-5.5-9z" fill="#0a3622"/><rect x="8" y="24" width="16" height="2" rx="1" fill="#0a3622"/><path d="M16 3.5v2.5" stroke="#0a3622" stroke-width="1.4" stroke-linecap="round"/><path d="M17.8 11.2a2.6 2.6 0 1 1-2.2-3.7 2 2 0 1 0 2.2 3.7z" fill="#e2c174"/></svg>`;
  const NAV = [
    ["prayer.html", "Prayer Times", "clock"], ["qibla.html", "Qibla", "compass"], ["events.html", "Events", "calendar"],
    ["planner.html", "AI Planner", "sparkle"], ["community.html", "Community", "chat"], ["map.html", "Mosques", "pin"],
    ["calendar.html", "Calendar", "moon"], ["donate.html", "Donate", "heart"]
  ];

  function renderChrome() {
    const here = location.pathname.split("/").pop() || "index.html";
    const header = document.createElement("header");
    header.className = "gnav";
    header.innerHTML = `<div class="wrap">
      <a class="logo" href="index.html" aria-label="MasjidHub home">${LOGO}<span>MasjidHub</span></a>
      <nav class="links" id="mh-links" aria-label="Main">${here !== "index.html" ? `<a href="index.html" class="home-link">${icon("home")}Home</a>` : ""}${NAV.map(([h, t, ic]) => `<a href="${h}"${h === here ? ' aria-current="page"' : ""}>${icon(ic)}${t}</a>`).join("")}</nav>
      <div class="tools">
        <button class="icon-btn" id="mh-text" title="Make text bigger or smaller" aria-label="Change text size">${icon("text")}<span class="lbl">Text size</span></button>
        <button class="icon-btn" id="mh-settings" title="My settings" aria-label="Open my settings">${icon("gear")}<span class="lbl">Settings</span></button>
        <button class="icon-btn menu-btn" id="mh-menu" aria-label="Open menu" aria-expanded="false" aria-controls="mh-links">${icon("menu")}</button>
      </div></div>`;
    document.body.prepend(header);
    const style = document.createElement("style");
    style.textContent = "@media (min-width:981px){.gnav .home-link{display:none}}";
    document.head.appendChild(style);
    header.querySelector("#mh-menu").onclick = e => {
      const o = header.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o);
      e.currentTarget.innerHTML = icon(o ? "close" : "menu");
    };
    header.querySelector("#mh-settings").onclick = () => openSettings();
    header.querySelector("#mh-text").onclick = () => {
      const next = { md: "lg", lg: "xl", xl: "md" }[prefs.text] || "lg";
      setPrefs({ text: next });
      toast({ md: "Normal text size", lg: "Large text", xl: "Extra large text" }[next]);
    };

    const foot = document.createElement("footer");
    foot.className = "gfoot";
    foot.innerHTML = `<div class="wrap">
      <div class="cols">
        <div><h5>Pray</h5><a href="prayer.html">Prayer Times</a><a href="qibla.html">Qibla Finder</a><a href="calendar.html">Islamic Calendar</a></div>
        <div><h5>Connect</h5><a href="events.html">Events</a><a href="community.html">Community</a><a href="planner.html">AI Day Planner</a></div>
        <div><h5>Mosques</h5><a href="map.html">Mosques Near You</a><a href="mosque.html">MCGP</a><a href="join.html">Add Your Mosque</a></div>
        <div><h5>Give</h5><a href="donate.html">Donate</a><a href="https://themuslimcenter.org/volunteer">Volunteer</a><a href="https://github.com/faarisaahmed/mc2">About this project</a></div>
      </div>
      <div class="legal"><span>MasjidHub demo for the Muslim Center of Greater Princeton. MCGP details come from <a style="display:inline" href="https://themuslimcenter.org">themuslimcenter.org</a>. Confirm times with your mosque.</span><span>Mosque data © OpenStreetMap contributors · Map tiles © Esri</span></div>
    </div>`;
    document.body.appendChild(foot);

    const t = document.createElement("div"); t.className = "toast"; t.id = "mh-toast"; t.setAttribute("role", "status"); document.body.appendChild(t);

    // Static pages write <i data-ic="pin"></i> where an icon belongs.
    document.querySelectorAll("i[data-ic]").forEach(el => { el.outerHTML = icon(el.dataset.ic, el.className); });
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("mh-toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------------- Settings: one simple question per screen ---------------- */
  // openSettings()            -> all settings, starting at the first step
  // openSettings(true)        -> first-visit welcome
  // openSettings({step:"loc"}) -> jump straight to one step
  function openSettings(arg) {
    const welcome = arg === true;
    const steps = welcome ? ["loc", "school", "age", "interests"] : ["loc", "school", "age", "interests", "display"];
    let i = Math.max(0, steps.indexOf(arg && arg.step));
    const draft = JSON.parse(JSON.stringify(prefs));
    let searchTimer = null, searchToken = 0;

    const bd = document.createElement("div");
    bd.className = "sheet-backdrop open";
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-title"></div>`;
    document.body.appendChild(bd);
    const sheet = bd.querySelector(".sheet");
    const $ = s => sheet.querySelector(s);
    const lastFocus = document.activeElement;

    const choice = (val, on, title, desc, ic) => `<button type="button" class="choice" data-v="${val}" aria-pressed="${on}">
      ${ic ? `<span class="c-ic">${icon(ic)}</span>` : ""}<span><span class="c-t">${title}</span>${desc ? `<span class="c-d">${desc}</span>` : ""}</span>
      <span class="c-check">${icon("check")}</span></button>`;

    const VIEWS = {
      loc: () => `
        <h2 id="sh-title">Where do you pray?</h2>
        <p class="intro">This sets your prayer times and shows the mosques closest to you.</p>
        <div class="loc-now" id="sh-locnow">${icon("pin")}<span>Prayer times for <strong id="sh-locname">${esc(draft.loc.name)}</strong></span></div>
        <button class="btn block" type="button" id="sh-gps" style="margin-top:16px">${icon("locate")} Find me automatically</button>
        <p class="hint" style="margin:8px 0 0;text-align:center">Your browser will ask to share your location. Tap <strong>Allow</strong>.</p>
        <div class="or">or type it in</div>
        <div class="search-box">${icon("search")}<input type="search" id="sh-q" placeholder="City or zip code, like Princeton or 08550" aria-label="Type your city or zip code" autocomplete="off" enterkeyhint="search"></div>
        <p class="hint" id="sh-status" aria-live="polite" style="margin:8px 2px 0;min-height:1.2em"></p>
        <div class="results" id="sh-results"></div>`,
      school: () => `
        <h2 id="sh-title">Which school of thought do you follow?</h2>
        <p class="intro">This only changes the time for Asr prayer.</p>
        <div class="choices" id="sh-asr">
          ${choice("hanafi", draft.asr === "hanafi", "Hanafi", "Asr starts later. Most common among Muslims from South Asia, Turkey, and Central Asia.", "book")}
          ${choice("standard", draft.asr === "standard", "Shafi'i, Maliki, or Hanbali", "Asr starts earlier. Common in the Arab world, Africa, and Southeast Asia.", "book")}
        </div>
        <p class="hint" style="margin:12px 2px 0">Not sure? Keep Hanafi, or ask your mosque. You can change this any time.</p>
        <details class="more"><summary>More options for Fajr and Isha</summary>
          <label class="label" for="sh-method" style="display:block;margin:10px 0 8px">Calculation method</label>
          <select id="sh-method">${Object.entries(METHODS).map(([k, m]) => `<option value="${k}"${k === draft.method ? " selected" : ""}>${m.t}</option>`).join("")}</select>
          <p class="hint" style="margin:8px 0 0">Most mosques in the US and Canada use ISNA. Choose Jafari for Shia timings.</p>
        </details>`,
      age: () => `
        <h2 id="sh-title">How old are you?</h2>
        <p class="intro">So we can show you events made for your age.</p>
        <div class="choices two" id="sh-age">${MH_DATA.ageGroups.map(a => choice(a.id, draft.age === a.id, a.t, a.d)).join("")}</div>
        <div class="label" style="margin:20px 0 8px">Show me events for</div>
        <div class="seg" id="sh-gender"><button type="button" data-v="any">Everyone</button><button type="button" data-v="female">Sisters</button><button type="button" data-v="male">Brothers</button></div>`,
      interests: () => `
        <h2 id="sh-title">What do you enjoy?</h2>
        <p class="intro">Pick as many as you like. We'll show these events first. You can skip this.</p>
        <div class="chips" id="sh-int">${MH_DATA.interests.map(x => `<button type="button" class="chip gold" data-v="${x.id}" aria-pressed="${draft.interests.includes(x.id)}">${icon(x.icon)} ${x.t}</button>`).join("")}</div>`,
      display: () => `
        <h2 id="sh-title">Look and feel</h2>
        <p class="intro">Make MasjidHub comfortable to read.</p>
        <div class="label" style="margin-bottom:8px">Light or dark</div>
        <div class="choices" id="sh-theme">
          ${choice("auto", draft.theme === "auto", "Automatic", "Matches your phone or computer, and switches by itself.", "auto")}
          ${choice("light", draft.theme === "light", "Always light", "", "sun")}
          ${choice("dark", draft.theme === "dark", "Always dark", "", "moon")}
        </div>
        <div class="label" style="margin:20px 0 8px">Text size</div>
        <div class="seg" id="sh-text"><button type="button" data-v="md">Normal</button><button type="button" data-v="lg">Large</button><button type="button" data-v="xl">Extra large</button></div>
        <details class="more"><summary>More options</summary>
          <div class="row" style="margin-top:10px">
            <div class="field"><label for="sh-clock">Clock</label><select id="sh-clock"><option value="12">12-hour (5:30 PM)</option><option value="24">24-hour (17:30)</option></select></div>
            <div class="field"><label for="sh-hadj">Hijri date</label><select id="sh-hadj">${[-2, -1, 0, 1, 2].map(v => `<option value="${v}">${v === 0 ? "No change" : (v > 0 ? "+" : "") + v + " day" + (Math.abs(v) === 1 ? "" : "s")}</option>`).join("")}</select></div>
          </div>
          <p class="hint" style="margin:0">Change the Hijri date if your mosque's moon sighting is a day different.</p>
        </details>`
    };

    function render() {
      const step = steps[i], last = i === steps.length - 1;
      sheet.innerHTML = `
        <div class="steps-bar">
          <div style="display:flex;align-items:center;gap:12px"><div class="dots" aria-hidden="true">${steps.map((s, n) => `<i class="${n <= i ? "on" : ""}"></i>`).join("")}</div><span class="step-count">Step ${i + 1} of ${steps.length}</span></div>
          <button type="button" class="sheet-close" id="sh-x" aria-label="${welcome ? "Skip setup" : "Close without saving"}">${icon("close")}</button>
        </div>
        ${VIEWS[step]()}
        <div class="actions">
          ${i > 0 ? `<button class="btn ghost" type="button" id="sh-back">${icon("back")} Back</button>` : (welcome ? `<button class="link-btn" type="button" id="sh-skip">Skip for now</button>` : "")}
          <span class="spacer"></span>
          ${!welcome && !last ? `<button class="btn ghost" type="button" id="sh-save2">Save</button>` : ""}
          <button class="btn" type="button" id="sh-next">${last ? `${icon("check")} ${welcome ? "Done" : "Save"}` : `Next ${icon("arrow")}`}</button>
        </div>`;
      wire(step);
      const focusEl = $("#sh-next");
      if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), 30);
      sheet.scrollTop = 0;
    }

    function pressGroup(sel, val) { sheet.querySelectorAll(sel + " [data-v]").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === String(val))); }

    function setLoc(loc) {
      draft.loc = loc;
      $("#sh-locname").textContent = loc.name;
      const n = $("#sh-locnow"); n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash");
      $("#sh-results").innerHTML = "";
      $("#sh-q").value = "";
      $("#sh-status").innerHTML = `<strong style="color:var(--accent)">Done.</strong> Prayer times are now for ${esc(loc.name)}.`;
    }

    async function runSearch(q) {
      const token = ++searchToken;
      $("#sh-status").textContent = "Searching…";
      try {
        const res = await searchPlace(q);
        if (token !== searchToken || !sheet.isConnected || !$("#sh-results")) return;
        $("#sh-status").textContent = res.length ? "Tap your place:" : "We couldn't find that place. Try adding the state or country, like “Princeton NJ”.";
        $("#sh-results").innerHTML = res.map((r, n) => `<button type="button" class="result" data-n="${n}">${icon("pin")}<span><span class="r-t">${esc(r.name)}</span><span class="r-d">${esc(r.full)}</span></span></button>`).join("");
        sheet.querySelectorAll(".result").forEach(b => b.onclick = () => { const r = res[+b.dataset.n]; setLoc({ lat: r.lat, lng: r.lng, name: r.name, source: "search" }); });
      } catch (e) {
        if (token === searchToken && $("#sh-status")) $("#sh-status").textContent = "Search isn't working right now. Please try “Find me automatically”.";
      }
    }

    function wire(step) {
      if (step === "loc") {
        $("#sh-gps").onclick = async e => {
          const b = e.currentTarget; b.disabled = true; b.innerHTML = `${icon("locate")} Finding you…`;
          try { setLoc(await locate()); } catch (err) { $("#sh-status").textContent = err.message; }
          b.disabled = false; b.innerHTML = `${icon("locate")} Find me automatically`;
        };
        $("#sh-q").oninput = e => {
          clearTimeout(searchTimer);
          const q = e.target.value.trim();
          if (q.length < 2) { $("#sh-results").innerHTML = ""; $("#sh-status").textContent = ""; return; }
          searchTimer = setTimeout(() => runSearch(q), 450);
        };
        $("#sh-q").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(searchTimer); const q = e.target.value.trim(); if (q) runSearch(q); } };
      }
      if (step === "school") {
        sheet.querySelectorAll("#sh-asr .choice").forEach(b => b.onclick = () => { draft.asr = b.dataset.v; pressGroup("#sh-asr", draft.asr); });
        $("#sh-method").onchange = e => { draft.method = e.target.value; };
      }
      if (step === "age") {
        pressGroup("#sh-gender", draft.gender);
        sheet.querySelectorAll("#sh-age .choice").forEach(b => b.onclick = () => { draft.age = draft.age === b.dataset.v ? null : b.dataset.v; pressGroup("#sh-age", draft.age); });
        sheet.querySelectorAll("#sh-gender [data-v]").forEach(b => b.onclick = () => { draft.gender = b.dataset.v; pressGroup("#sh-gender", draft.gender); });
      }
      if (step === "interests") {
        sheet.querySelectorAll("#sh-int .chip").forEach(b => b.onclick = () => {
          const v = b.dataset.v;
          draft.interests = draft.interests.includes(v) ? draft.interests.filter(x => x !== v) : draft.interests.concat(v);
          b.setAttribute("aria-pressed", draft.interests.includes(v));
        });
      }
      if (step === "display") {
        pressGroup("#sh-text", draft.text);
        $("#sh-clock").value = draft.clock; $("#sh-hadj").value = String(draft.hijriAdj);
        sheet.querySelectorAll("#sh-theme .choice").forEach(b => b.onclick = () => { draft.theme = b.dataset.v; pressGroup("#sh-theme", draft.theme); });
        sheet.querySelectorAll("#sh-text [data-v]").forEach(b => b.onclick = () => { draft.text = b.dataset.v; pressGroup("#sh-text", draft.text); });
        $("#sh-clock").onchange = e => { draft.clock = e.target.value; };
        $("#sh-hadj").onchange = e => { draft.hijriAdj = parseInt(e.target.value, 10); };
      }
      $("#sh-x").onclick = cancel;
      if ($("#sh-skip")) $("#sh-skip").onclick = cancel;
      if ($("#sh-back")) $("#sh-back").onclick = () => { i--; render(); };
      if ($("#sh-save2")) $("#sh-save2").onclick = save;
      $("#sh-next").onclick = () => { if (i < steps.length - 1) { i++; render(); } else save(); };
    }

    function close() { bd.remove(); document.removeEventListener("keydown", onKey); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function cancel() { if (welcome) setPrefs({ onboarded: true }); close(); }
    function save() {
      setPrefs({ loc: draft.loc, asr: draft.asr, method: draft.method, age: draft.age, gender: draft.gender, interests: draft.interests,
        theme: draft.theme, text: draft.text, clock: draft.clock, hijriAdj: draft.hijriAdj, onboarded: true });
      close();
      toast(welcome ? "All set. MasjidHub is now personalized for you." : "Saved");
    }
    const onKey = e => { if (e.key === "Escape") cancel(); };
    document.addEventListener("keydown", onKey);
    bd.addEventListener("click", e => { if (e.target === bd) cancel(); });
    render();
  }

  /* ---------------- Public API ---------------- */
  window.MH = {
    get prefs() { return prefs; }, setPrefs, onPrefs, store,
    METHODS, PRAYERS, prayerTimes, todayTimes, nextPrayer, qiblaBearing, KAABA, distanceKm, fmtDistance, compassWord,
    hijri, fmtHijri, HIJRI_MONTHS, ISLAMIC_DAYS, islamicDay, upcomingIslamicDays,
    fmtTime, fmtDate, fmtCountdown, ymd, parseYmd, esc,
    locate, searchPlace, allMosques,
    occurrences, matchScore, fitsAge, fitsAudience, ageLabel, audienceLabel, interestName, icsFor, download,
    openSettings, toast, icon, LOGO
  };

  document.addEventListener("DOMContentLoaded", renderChrome);
})();
