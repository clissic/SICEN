const CORNER_LOGO_LIGHT = "/img/cintaPNN.png";
const CORNER_LOGO_DARK = "/img/cintaPNN-dark.png";
const THEME_STORAGE_KEY = "sistemaCentinela.theme";
const THEME_STORAGE_KEY_LEGACY = "sigmu.theme";

function getPreferredTheme() {
  let saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved !== "dark" && saved !== "light") {
    saved = localStorage.getItem(THEME_STORAGE_KEY_LEGACY);
    if (saved === "dark" || saved === "light") {
      localStorage.setItem(THEME_STORAGE_KEY, saved);
      localStorage.removeItem(THEME_STORAGE_KEY_LEGACY);
    }
  }
  if (saved === "dark" || saved === "light") return saved;

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function updateCornerLogo(theme) {
  const logo = document.getElementById("cornerLogo");
  if (!logo || logo.tagName !== "IMG") return;
  const nextSrc = theme === "dark" ? CORNER_LOGO_DARK : CORNER_LOGO_LIGHT;
  if (logo.getAttribute("src") !== nextSrc) {
    logo.setAttribute("src", nextSrc);
  }
}

function applyTheme(theme) {
  const mode = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", mode);

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
  }

  updateCornerLogo(theme);
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("themeToggle");
  const theme = getPreferredTheme();
  applyTheme(theme);

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    const next = isDark ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  });
});