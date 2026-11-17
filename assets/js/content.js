/* Live mosque content: profile, iqamah times, events and announcements that mosque admins edit in admin.html.
   Loads after data.js and before core.js. It reads Firestore's public REST API with plain fetch (no Firebase SDK),
   so ordinary visitors download nothing extra.
   1. Right away, it lays the last saved copy (localStorage "mh:content") over MH_DATA, so pages draw with it.
   2. After the page loads, it fetches the latest; if anything changed it saves it and asks the page to redraw.
   data.js stays the fallback: it is used as-is until a mosque is published from the dashboard. */
(function () {
  const PROJECT = "masjidhub-mc2";
  const KEY = "AIzaSyAJPBdQQeZucNA1YIKzie0AiFESjydCMmc";   // public web key; firestore.rules decide access
  const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const CACHE = "mh:content";

  // data.js as shipped. Its events have no mosque field: they all belong to the first mosque (MCGP).
  const base = {
    mosques: MH_DATA.mosques.map(m => Object.assign({}, m)),
    events: MH_DATA.events.map(e => Object.assign({ mosque: MH_DATA.mosques[0].id }, e))
  };
  const EMPTY_MOSQUE = { values: "", about: "", phone: "", website: "", features: [], pillars: [], education: [], services: [], contacts: [], social: [], causes: [] };

  function apply(c) {
    const mosques = base.mosques.map(m => Object.assign({}, m));
    let events = base.events.slice();
    const managed = new Set();
    (c && c.mosques || []).filter(r => r.published).forEach(r => {
      const i = mosques.findIndex(m => m.id === r.id);
      const clean = {};
      Object.keys(r).forEach(k => { if (r[k] != null) clean[k] = r[k]; });
      const merged = Object.assign({}, i > -1 ? mosques[i] : EMPTY_MOSQUE, clean, { live: true });
      if (i > -1) mosques[i] = merged; else mosques.push(merged);
      if (r.managed) managed.add(r.id);
    });
    events = events.filter(e => !managed.has(e.mosque))
      .concat((c && c.events || []).filter(e => managed.has(e.mosque)));
    const today = new Date().toISOString().slice(0, 10);
    const live = new Set(mosques.filter(m => m.live).map(m => m.id));
    MH_DATA.mosques = mosques;
    MH_DATA.events = events;
    MH_DATA.announcements = (c && c.announcements || [])
      .filter(a => live.has(a.mosque) && a.from <= today && a.until >= today)
      .sort((a, b) => (a.kind === "news") - (b.kind === "news") || (b.from > a.from ? 1 : -1));
  }

  // Firestore REST values -> plain JS.
  function val(v) {
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
    if ("mapValue" in v) return fields(v.mapValue.fields || {});
    return null;
  }
  function fields(f) { const o = {}; Object.keys(f).forEach(k => { o[k] = val(f[k]); }); return o; }

  async function query(collectionId, allDescendants) {
    const res = await fetch(`${ROOT}:runQuery?key=${KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants }], limit: 1000 } })
    });
    if (!res.ok) throw new Error("content " + res.status);
    return (await res.json()).filter(r => r.document).map(r => {
      const id = r.document.name.split("/").pop();
      return Object.assign(fields(r.document.fields || {}), { id });
    });
  }

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(CACHE) || "null"); } catch (e) { /* private mode */ }
  apply(saved);

  async function refresh() {
    try {
      const [mosques, events, announcements] = await Promise.all([query("mosques", false), query("events", true), query("announcements", true)]);
      // Drop admin-only bookkeeping so it doesn't count as a change.
      const strip = x => { delete x.updated; delete x.updatedBy; delete x.created; delete x.by; return x; };
      const fresh = { mosques: mosques.map(strip), events: events.map(strip), announcements: announcements.map(strip) };
      if (JSON.stringify(fresh) === JSON.stringify(saved)) return;
      saved = fresh;
      try { localStorage.setItem(CACHE, JSON.stringify(fresh)); } catch (e) { /* ignore */ }
      apply(fresh);
      if (window.MH && MH.redraw) MH.redraw();
      alertUrgent();
      document.dispatchEvent(new CustomEvent("mh:content"));
    } catch (e) { /* offline or blocked: keep the saved copy */ }
  }

  // "Urgent mosque announcements" (Account page): a notification for each new urgent or janazah notice.
  function alertUrgent() {
    if (!window.MH || !MH.store.get("notify-ann", false) || !MH.canNotify()) return;
    const seen = MH.store.get("ann-seen", []);
    const fresh = (MH_DATA.announcements || []).filter(a => a.kind !== "news" && !seen.includes(a.id));
    fresh.slice(0, 3).forEach(a => MH.showNotification(a.title, a.body || "", "masjidhub-ann-" + a.id));
    if (fresh.length) MH.store.set("ann-seen", seen.concat(fresh.map(a => a.id)).slice(-100));
  }

  window.MH_CONTENT = { refresh, base, get loaded() { return !!saved; } };
  if (location.protocol.startsWith("http")) window.addEventListener("load", () => setTimeout(refresh, 50));
})();
