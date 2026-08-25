import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
