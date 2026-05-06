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
