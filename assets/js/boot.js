/* Runs in <head> before the page paints: applies the saved theme and text size so nothing flashes. */
(function () {
  try {
    var p = JSON.parse(localStorage.getItem("mh:prefs") || "{}"), h = document.documentElement;
    if (p.theme === "light" || p.theme === "dark") h.setAttribute("data-theme", p.theme);
    if (p.text === "lg" || p.text === "xl") h.classList.add("text-" + p.text);
  } catch (e) { /* storage blocked: fall back to the device theme */ }
})();
