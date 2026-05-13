import { useEffect, useState } from "react";

const KEY = "sistemaCentinela.theme";
const LEGACY = "sigmu.theme";

function readTheme() {
  let saved = localStorage.getItem(KEY);
  if (saved !== "dark" && saved !== "light") {
    saved = localStorage.getItem(LEGACY);
    if (saved === "dark" || saved === "light") {
      localStorage.setItem(KEY, saved);
      localStorage.removeItem(LEGACY);
    }
  }
  if (saved === "dark" || saved === "light") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/**
 * Alinea `<html data-bs-theme>` con la preferencia guardada (o `prefers-color-scheme`)
 * antes de que monte cualquier pantalla (p. ej. carga de sesión sin `Layout`).
 */
export function applyStoredBootstrapTheme() {
  if (typeof document === "undefined") return;
  const mode = readTheme() === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", mode);
}

/** Tema efectivo de Bootstrap (`light` | `dark`) según `data-bs-theme` en `<html>`. */
export function useBootstrapTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    const fromDom = document.documentElement.getAttribute("data-bs-theme");
    if (fromDom === "dark" || fromDom === "light") return fromDom;
    return readTheme();
  });

  useEffect(() => {
    const el = document.documentElement;

    const syncFromDom = () => {
      const v = el.getAttribute("data-bs-theme");
      if (v === "dark" || v === "light") setTheme(v);
    };

    const onStorage = (e) => {
      if (e.key !== KEY && e.key !== LEGACY) return;
      setTheme(readTheme());
    };

    syncFromDom();
    const obs = new MutationObserver(syncFromDom);
    obs.observe(el, { attributes: true, attributeFilter: ["data-bs-theme"] });
    window.addEventListener("storage", onStorage);
    return () => {
      obs.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const mode = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", mode);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const checked = theme === "dark";

  return (
    <div className="d-flex flex-row flex-nowrap align-items-center gap-2">
      <i
        className={`bi bi-sun flex-shrink-0 ${checked ? "text-muted opacity-50" : "text-body"}`}
        style={{ fontSize: "1rem" }}
        aria-hidden
      />
      <div className="form-check form-switch m-0 p-0 d-flex align-items-center">
        <input
          className="form-check-input m-0"
          type="checkbox"
          role="switch"
          id="themeSwitch"
          checked={checked}
          onChange={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label="Alternar entre tema claro y oscuro"
        />
      </div>
      <i
        className={`bi bi-moon flex-shrink-0 ${checked ? "text-body" : "text-muted opacity-50"}`}
        style={{ fontSize: "1rem" }}
        aria-hidden
      />
    </div>
  );
}
