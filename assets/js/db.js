/* MasjidHub database (Firebase Firestore), exposed as window.MH_DB.
   Firebase is loaded only when a page first needs it, so pages that don't use it make no extra requests.
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

  let ready = null;
  function load() {
    if (!ready) {
      ready = Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-firestore.js")])
        .then(([app, fs]) => ({ fs, db: fs.getFirestore(app.initializeApp(CONFIG)) }))
        .catch(err => { ready = null; throw err; });   // let a later try load it again (e.g. back online)
    }
    return ready;
  }

  // Sends a mosque application. Returns its id, which is also what lets this browser withdraw it.
  async function addApplication(a) {
    const { fs, db } = await load();
    const ref = await fs.addDoc(fs.collection(db, "applications"), Object.assign({}, a, { status: "pending", submitted: fs.serverTimestamp() }));
    return ref.id;
  }
  async function withdrawApplication(id) {
    const { fs, db } = await load();
    await fs.deleteDoc(fs.doc(db, "applications", id));
  }

  window.MH_DB = { addApplication, withdrawApplication };
})();
