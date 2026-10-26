/* Runs in <head> before the page paints: applies the saved theme, text size and language direction so nothing flashes. */
(function () {
  var h = document.documentElement;
  try {
    var p = JSON.parse(localStorage.getItem("mh:prefs") || "{}");
    if (p.theme === "light" || p.theme === "dark") h.setAttribute("data-theme", p.theme);
    if (p.text === "lg" || p.text === "xl") h.classList.add("text-" + p.text);
    var ok = ["ar", "ur", "bn", "tr", "fr", "es"], lang = p.lang;
    if (!lang) (navigator.languages || [navigator.language || "en"]).some(function (l) { l = String(l).slice(0, 2).toLowerCase(); if (l === "en" || ok.indexOf(l) > -1) { lang = l; return true; } });
    if (ok.indexOf(lang) > -1) {
      h.lang = lang;
      if (lang === "ar" || lang === "ur") h.dir = "rtl";
      // Hide the English text until the translation is in place (core.js shows it again; this is the safety net).
      h.classList.add("mh-translating");
      setTimeout(function () { h.classList.remove("mh-translating"); }, 2500);
    }
  } catch (e) { /* storage blocked: fall back to the device theme */ }
})();
