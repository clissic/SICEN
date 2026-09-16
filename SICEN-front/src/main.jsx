import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { applyStoredBootstrapTheme } from "./components/ThemeToggle.jsx";
import "sweetalert2/dist/sweetalert2.min.css";
import "./styles/sweetalert2-theme.css";
import "./styles/menu-tiles.css";
import "./styles/user-state-badges.css";
import "./styles/car-brand-combobox.css";
import "./styles/vessel-combobox.css";
import "./styles/inspector-badge.css";
import "./styles/car-fine-card.css";
import "./styles/mi-unidad.css";
import "./styles/login-page.css";
import "./styles/centinela-map.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

applyStoredBootstrapTheme();

/**
 * En build:watch (__SICEN_ENABLE_PWA__=false) no registramos SW y limpiamos
 * cualquier service worker/cache residual que dejaba la SPA colgada al refrescar.
 * En build de producción sí se registra la PWA.
 */
async function setupPwa() {
  if (typeof __SICEN_ENABLE_PWA__ !== "undefined" && !__SICEN_ENABLE_PWA__) {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches?.keys) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
    return;
  }
  registerSW({ immediate: true });
}

void setupPwa();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
