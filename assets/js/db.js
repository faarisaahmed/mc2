/* MasjidHub accounts and database (Firebase Auth + Firestore), exposed as window.MH_DB.
   The Firebase SDK is loaded only when it's needed (signing in, an RSVP, the admin pages, or syncing a
   signed-in person's settings), so most visits download nothing extra. Public mosque content is read by
   content.js without the SDK.
   This config is meant to be public: what can be read or written is decided by firestore.rules. */
(function () {
  const SDK = "https://www.gstatic.com/firebasejs/13.1.0/";
  const CONFIG = {
    apiKey: "AIzaSyAJPBdQQeZucNA1YIKzie0AiFESjydCMmc",
    authDomain: "masjidhub-mc2.firebaseapp.com",
    projectId: "masjidhub-mc2",
    storageBucket: "masjidhub-mc2.firebasestorage.app",
    messagingSenderId: "75512558302",
    appId: "1:75512558302:web:91ca444ee76b9e4561884f"
  };
  // Settings that follow the person between devices. Text size, theme and language stay per device.
  const SYNCED = ["loc", "method", "asr", "age", "gender", "interests", "hijriAdj", "clock"];

  let ready = null, firstUser = null;
  function load() {
    if (!ready) {
      ready = Promise.all(["firebase-app.js", "firebase-firestore.js", "firebase-auth.js"].map(f => import(SDK + f)))
        .then(([app, fs, au]) => {
          const a = app.initializeApp(CONFIG), auth = au.getAuth(a);
          firstUser = new Promise(res => { const off = au.onAuthStateChanged(auth, u => { off(); res(u); }); });
          au.onAuthStateChanged(auth, remember);
          return { fs, au, db: fs.getFirestore(a), auth };
        })
        .catch(err => { ready = null; throw err; });   // let a later try load it again (e.g. back online)
    }
    return ready;
  }
  // The signed-in user (or null) once Firebase has restored the session.
  async function user() { const { auth } = await load(); await firstUser; return auth.currentUser; }

  // A small copy of who is signed in, so pages can show it without loading Firebase.
  function remember(u) {
    if (u) MH.store.set("account", { uid: u.uid, name: u.displayName || "", email: u.email || "", verified: u.emailVerified });
    else { MH.store.set("account", null); MH.store.set("rsvps", []); MH.store.set("prefs-synced", 0); }
    const b = document.getElementById("mh-account");
    if (b) { b.classList.toggle("signed-in", !!u); b.setAttribute("aria-label", u ? "My account" : "Sign in"); }
  }

  /* ---------- Signing in ---------- */
  const MESSAGES = {
    "auth/operation-not-allowed": "That way of signing in isn't switched on yet. Please tell the MasjidHub team.",
    "auth/invalid-action-code": "This link has already been used or is out of date.",
    "auth/expired-action-code": "This link has expired.",
    "auth/invalid-credential": "That email and password don't match. Try again, or reset your password.",
    "auth/wrong-password": "That email and password don't match. Try again, or reset your password.",
    "auth/user-not-found": "There's no account with that email yet. Create one below.",
    "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
    "auth/weak-password": "Please use a password of at least 8 characters.",
    "auth/invalid-email": "Please check your email address.",
    "auth/too-many-requests": "Too many tries. Please wait a few minutes and try again.",
    "auth/network-request-failed": "You seem to be offline. Check your connection and try again.",
    "auth/unauthorized-domain": "Sign-in isn't set up for this web address yet. Please tell the MasjidHub team.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "permission-denied": "You don't have permission to do that."
  };
  function friendly(err) { return new Error(MESSAGES[err && err.code] || (err && err.message) || "Something went wrong. Please try again."); }
  const wrap = fn => async (...args) => { try { return await fn(...args); } catch (e) { throw friendly(e); } };

  const signInGoogle = wrap(async () => {
    const { au, auth } = await load();
    const provider = new au.GoogleAuthProvider();
    try { await au.signInWithPopup(auth, provider); }
    catch (e) { if (e.code === "auth/popup-blocked") return au.signInWithRedirect(auth, provider); throw e; }
    await afterSignIn();
  });
  // Invites: Firebase emails a one-tap sign-in link to any address, account or not. Opening it on account.html
  // signs them in (creating the account) with their email already verified. Needs "Email link (passwordless
  // sign-in)" turned on under Email/Password in the Firebase console, and works only from the live site
  // (the return address must be on the authorized domains list).
  // true once the Cloud Functions in functions/ are deployed (Blaze plan): they send a branded invite email for every
  // new invite, so the site no longer sends Firebase's plain sign-in email itself. See functions/README.md.
  const SERVER_EMAILS = true;
  const sendInviteLink = wrap(async email => {
    const { au, auth } = await load();
    await au.sendSignInLinkToEmail(auth, email, { url: "https://faarisaahmed.github.io/mc2/account.html?invited=" + encodeURIComponent(email), handleCodeInApp: true });
  });
  const isInviteLink = async () => { const { au, auth } = await load(); return au.isSignInWithEmailLink(auth, location.href); };
  const signInWithInvite = wrap(async email => {
    const { au, auth } = await load();
    await au.signInWithEmailLink(auth, email, location.href);
    await afterSignIn();
  });
  const signInEmail = wrap(async (email, password) => {
    const { au, auth } = await load();
    await au.signInWithEmailAndPassword(auth, email, password);
    await afterSignIn();
  });
  const createAccount = wrap(async (name, email, password) => {
    const { au, auth } = await load();
    const cred = await au.createUserWithEmailAndPassword(auth, email, password);
    await au.updateProfile(cred.user, { displayName: name });
    await au.sendEmailVerification(cred.user, backHere());
    remember(cred.user);
    await afterSignIn();
  });
  // After using a link in our emails, Firebase's page offers a "Continue" button back to the Account page.
  // Only on the live site: other hosts (localhost, forks) aren't on Firebase's authorized domains list, which would make sending fail.
  const backHere = () => location.hostname === "faarisaahmed.github.io" ? { url: new URL("account.html", location.href).href } : undefined;
  const resendVerification = wrap(async () => { const { au, auth } = await load(); await au.sendEmailVerification(auth.currentUser, backHere()); });
  const resetPassword = wrap(async email => { const { au, auth } = await load(); await au.sendPasswordResetEmail(auth, email, backHere()); });
  // Links in Firebase's emails (verify, reset password, undo an email change) open account.html?mode=...&oobCode=...
  // once "Customize action URL" in the Firebase console points there. These finish them on our own page.
  const applyEmailCode = wrap(async code => { const { au, auth } = await load(); await au.applyActionCode(auth, code); });
  const checkResetCode = wrap(async code => { const { au, auth } = await load(); return au.verifyPasswordResetCode(auth, code); });
  const finishReset = wrap(async (code, password) => { const { au, auth } = await load(); await au.confirmPasswordReset(auth, code, password); });
  // Picks up "email verified" after the person clicks the link in their email.
  const reloadUser = wrap(async () => {
    const { auth } = await load();
    if (!auth.currentUser) return null;
    await auth.currentUser.reload(); await auth.currentUser.getIdToken(true);
    remember(auth.currentUser);
    return auth.currentUser;
  });
  const signOut = wrap(async () => { const { au, auth } = await load(); await au.signOut(auth); });
  const setName = wrap(async name => {
    const { au, auth, fs, db } = await load();
    await au.updateProfile(auth.currentUser, { displayName: name });
    await fs.setDoc(fs.doc(db, "users", auth.currentUser.uid), { name, updated: fs.serverTimestamp() }, { merge: true });
    remember(auth.currentUser);
  });
  // Deletes the person's RSVPs, profile and sign-in. Firebase may ask them to sign in again first.
  const deleteAccount = wrap(async () => {
    const { au, auth, fs, db } = await load();
    const u = auth.currentUser;
    const mine = await fs.getDocs(fs.query(fs.collectionGroup(db, "rsvps"), fs.where("uid", "==", u.uid)));
    await Promise.all(mine.docs.map(d => fs.deleteDoc(d.ref)));
    await fs.deleteDoc(fs.doc(db, "users", u.uid));
    await fs.deleteDoc(fs.doc(db, "admins", u.uid));   // allowed (and harmless) even if they weren't an admin
    try { await au.deleteUser(u); }
    catch (e) { if (e.code === "auth/requires-recent-login") throw new Error("For your safety, please sign out, sign in again, then delete your account."); throw e; }
  });

  /* ---------- Settings that follow you ---------- */
  let applying = false, pushTimer = null;
  function pick(p) { const o = {}; SYNCED.forEach(k => { if (p[k] !== undefined) o[k] = p[k]; }); return o; }
  async function pushPrefs() {
    const { fs, db, auth } = await load();
    await firstUser; const u = auth.currentUser; if (!u) return;
    await fs.setDoc(fs.doc(db, "users", u.uid), { prefs: pick(MH.prefs), notify: notifySettings(), updated: fs.serverTimestamp() }, { merge: true });
    MH.store.set("prefs-synced", Date.now());
  }
  function notifySettings() {
    return { prayers: MH.store.get("notify-prayers", ["fajr", "dhuhr", "asr", "maghrib", "isha"]), before: MH.store.get("notify-before", 0), announcements: MH.store.get("notify-ann", false) };
  }
  // On sign-in: use the settings saved in the account if there are any, otherwise save this device's.
  async function afterSignIn() {
    const { fs, db, auth } = await load();
    const u = auth.currentUser; if (!u) return;
    remember(u);
    const snap = await fs.getDoc(fs.doc(db, "users", u.uid));
    const cloud = snap.exists() ? snap.data() : null;
    if (cloud && cloud.prefs && Object.keys(cloud.prefs).length) {
      applying = true; MH.setPrefs(cloud.prefs); applying = false;
      if (cloud.notify) {
        if (cloud.notify.prayers) MH.store.set("notify-prayers", cloud.notify.prayers);
        if (cloud.notify.before != null) MH.store.set("notify-before", cloud.notify.before);
        if (cloud.notify.announcements != null) MH.store.set("notify-ann", cloud.notify.announcements);
      }
      MH.store.set("prefs-synced", Date.now());
    } else {
      await fs.setDoc(fs.doc(db, "users", u.uid), { name: u.displayName || "", prefs: pick(MH.prefs), notify: notifySettings(), updated: fs.serverTimestamp() }, { merge: true });
    }
    await refreshRsvps();
  }
  function queuePush() {
    if (applying || !MH.store.get("account", null)) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushPrefs().catch(() => { /* offline: next change will try again */ }), 2500);
  }

  /* ---------- RSVPs and volunteer sign-ups ---------- */
  async function refreshRsvps() {
    const { fs, db, auth } = await load();
    await firstUser; const u = auth.currentUser; if (!u) return [];
    const snap = await fs.getDocs(fs.query(fs.collectionGroup(db, "rsvps"), fs.where("uid", "==", u.uid)));
    const list = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    MH.store.set("rsvps", list.map(r => `${r.event}_${r.date}`));
    return list;
  }
  // Signs up for one occurrence of an event, or cancels. Resolves to true when now signed up.
  const toggleRsvp = wrap(async (e) => {
    const { fs, db, auth } = await load();
    await firstUser; const u = auth.currentUser;
    if (!u) { location.href = "account.html"; return false; }
    const date = MH.ymd(e.start), id = `${e.id}_${date}_${u.uid}`, ref = fs.doc(db, "mosques", e.mosque.id, "rsvps", id);
    const keys = MH.store.get("rsvps", []), key = `${e.id}_${date}`;
    if (keys.includes(key)) {
      await fs.deleteDoc(ref);
      MH.store.set("rsvps", keys.filter(k => k !== key));
      return false;
    }
    await fs.setDoc(ref, { mosque: e.mosque.id, event: e.id, date, uid: u.uid, name: u.displayName || u.email || "Member",
      kind: e.rsvp ? "going" : "volunteer", party: 1, title: e.title, created: fs.serverTimestamp() });
    MH.store.set("rsvps", keys.concat(key));
    return true;
  });

  /* ---------- Roles ---------- */
  // sha256 of the top admin's email; must match isTop() in firestore.rules. Only decides what the UI shows:
  // the rules are what actually let the top admin in.
  const TOP = "6999570343bf5ae6c1bd50b98aa56ab6ad563b513d3a13ebd88e8849fcaea5fc";
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }
  const NO_ROLES = { top: false, siteAdmin: false, perms: { mosques: false, applications: false }, mosques: [], invites: [], adminInvite: null };
  // { top, siteAdmin, perms: { mosques, applications }, mosques: [{ id, role }],
  //   invites: [{ mosque, mosqueName, role, email }], adminInvite: { email, perms } | null }
  async function roles() {
    const { fs, db, auth } = await load();
    await firstUser; const u = auth.currentUser;
    if (!u) return NO_ROLES;
    // Verified in another tab after signing in: the sign-in token still says "not verified", and the database rules
    // read the token. Get a fresh one so admin access works without signing out and in again.
    if (u.emailVerified && !(await u.getIdTokenResult()).claims.email_verified) await u.getIdToken(true);
    const email = (u.email || "").toLowerCase(), verified = u.emailVerified && !!email;
    const [top, admin, mem, inv, adminInvite] = await Promise.all([
      verified ? sha256(email).then(h => h === TOP) : false,
      fs.getDoc(fs.doc(db, "admins", u.uid)).then(d => d.exists() ? d.data() : null, () => null),
      fs.getDocs(fs.query(fs.collectionGroup(db, "members"), fs.where("uid", "==", u.uid))).then(s => s.docs.map(d => ({ id: d.ref.parent.parent.id, role: d.data().role })), () => []),
      verified
        ? fs.getDocs(fs.query(fs.collectionGroup(db, "invites"), fs.where("email", "==", email))).then(s => s.docs.map(d => d.data()), () => [])
        : Promise.resolve([]),
      verified ? fs.getDoc(fs.doc(db, "adminInvites", email)).then(d => d.exists() ? d.data() : null, () => null) : null
    ]);
    const p = top ? { mosques: true, applications: true } : Object.assign({ mosques: false, applications: false }, admin && admin.perms);
    return { top, siteAdmin: top || !!admin, perms: p, mosques: mem, invites: inv.filter(i => !mem.some(m => m.id === i.mosque)),
      adminInvite: top || admin ? null : adminInvite };
  }
  // Joins a mosque's team from an invite sent to this person's verified email.
  const acceptInvite = wrap(async inv => {
    const { fs, db, auth } = await load();
    const u = auth.currentUser, email = u.email.toLowerCase();
    await fs.setDoc(fs.doc(db, "mosques", inv.mosque, "members", u.uid), { uid: u.uid, email, name: u.displayName || "", role: inv.role, added: fs.serverTimestamp() });
    await fs.deleteDoc(fs.doc(db, "mosques", inv.mosque, "invites", email));
  });
  const declineInvite = wrap(async inv => {
    const { fs, db, auth } = await load();
    await fs.deleteDoc(fs.doc(db, "mosques", inv.mosque, "invites", auth.currentUser.email.toLowerCase()));
  });
  // Becomes a site admin from the top admin's invite, with exactly the permissions it offered.
  const acceptAdminInvite = wrap(async inv => {
    const { fs, db, auth } = await load();
    const u = auth.currentUser, email = u.email.toLowerCase();
    await fs.setDoc(fs.doc(db, "admins", u.uid), { uid: u.uid, email, name: u.displayName || "", perms: inv.perms, added: fs.serverTimestamp() });
    await fs.deleteDoc(fs.doc(db, "adminInvites", email));
  });
  const declineAdminInvite = wrap(async () => {
    const { fs, db, auth } = await load();
    await fs.deleteDoc(fs.doc(db, "adminInvites", auth.currentUser.email.toLowerCase()));
  });

  /* ---------- "Add your mosque" ---------- */
  // Sends a mosque application. Returns its id, which is also what lets this browser withdraw it.
  async function addApplication(a) {
    const { fs, db, auth } = await load();
    await firstUser; const u = auth.currentUser;
    const data = Object.assign({}, a, { status: "pending", submitted: fs.serverTimestamp() }, u ? { uid: u.uid } : {});
    const ref = await fs.addDoc(fs.collection(db, "applications"), data);
    return ref.id;
  }
  async function withdrawApplication(id) {
    const { fs, db } = await load();
    await fs.deleteDoc(fs.doc(db, "applications", id));
  }

  window.MH_DB = {
    load, user, friendly, SERVER_EMAILS, sendInviteLink, isInviteLink, signInWithInvite, signInGoogle, signInEmail, createAccount, resendVerification, resetPassword, reloadUser, applyEmailCode, checkResetCode, finishReset,
    signOut, setName, deleteAccount, pushPrefs, refreshRsvps, toggleRsvp, roles, acceptInvite, declineInvite, acceptAdminInvite, declineAdminInvite, syncNow: afterSignIn,
    addApplication, withdrawApplication, SYNCED
  };

  // Signed-in visitors: save setting changes to the account, and pick up changes from other devices
  // at most every 6 hours. Visitors who never signed in never load Firebase from here.
  document.addEventListener("DOMContentLoaded", () => {
    MH.onPrefs(queuePush);
    const acct = MH.store.get("account", null);
    if (acct && location.protocol.startsWith("http") && Date.now() - MH.store.get("prefs-synced", 0) > 6 * 3600000) {
      setTimeout(() => user().then(u => u ? afterSignIn() : remember(null)).then(() => MH.redraw()).catch(() => {}), 1500);
    }
  });
})();
