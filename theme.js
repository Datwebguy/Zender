// Sets light or dark before the page draws, so there's no flash. Saved choice first, then the phone's setting.
(function () {
  var t = null;
  try {
    t = localStorage.getItem("zender:theme");
  } catch (e) {}
  if (t !== "light" && t !== "dark") t = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
})();
