# Sistema Centinela — Paleta de colores (Light + Dark)

Este documento describe la **paleta y los tokens CSS** de la SPA React, en **`src/styles/sistema.css`**, alineados con el **modo claro/oscuro de Bootstrap 5** (`data-bs-theme` en `<html>`).

---

## Cómo se activa el tema

- **`src/components/ThemeToggle.jsx`** lee `localStorage` (`sistemaCentinela.theme`: `light` | `dark`; migra desde una clave de tema antigua si aún existe) o `prefers-color-scheme`, y aplica:
  - `document.documentElement.setAttribute("data-bs-theme", "light" | "dark")`
- Los estilos propios usan selectores **`html[data-bs-theme="dark"]`** y **`html[data-bs-theme="light"]`** (no `data-theme`).

---

## Tokens CSS propios (implementados)

Definidos en **`src/styles/sistema.css`**: parte en **`:root`** (modo claro implícito) y sobrescritura en **`html[data-bs-theme="dark"]`**.

| Token | Uso |
|--------|-----|
| `--text` | Texto principal |
| `--text-muted` | Subtítulos / labels secundarios |
| `--control-bg` | Fondo de inputs principales (dark) |
| `--control-text` | Texto dentro de inputs |
| `--control-muted-bg` | Fondo de inputs “muted” / filtros |
| `--placeholder` | Placeholders |
| `--surface-card` | Tarjetas, paneles, filtros, perfil (`#fineSearchContainer`, `.fineCard`, `.userInfo`, etc.) |
| `--border-card` | Bordes de tarjetas y secciones |

### Valores actuales (referencia)

**Modo claro** (`:root`):

- `--text`: `#000000`
- `--surface-card`: `#ffffff`
- `--text-muted`: `#6b7280`
- `--border-card`: `rgba(128, 128, 128, 0.2)`
- `--control-bg` / `--control-text` / `--control-muted-bg` / `--placeholder`: ver `sistema.css`

**Modo oscuro** (`html[data-bs-theme="dark"]`):

- `--text`: `#e6eaf2`
- **`--surface-card`: `#121212`** (superficie principal en dark)
- `--text-muted`: `#94a3b8`
- `--border-card`: `#25324a`
- `--control-bg`: `#0f172a`
- `--control-muted-bg`: `#111827`
- etc.

---

## Integración con Bootstrap 5

En **`html[data-bs-theme="dark"]`** también se definen variables **`--bs-*`** (cuerpo, bordes, enlaces, etc.) para que componentes Bootstrap (`.card`, `.btn`, tablas, formularios) respeten el mismo fondo oscuro y contraste. Ejemplos:

- `--bs-body-bg`, `--bs-body-color`
- `--bs-border-color`, `--bs-heading-color`
- `--bs-link-color`, `--bs-link-hover-color`

En **`html[data-bs-theme="light"]`** hay overrides mínimos de `--bs-body-bg` / `--bs-border-color` para coherencia con el modo claro.

---

## Colores de marca y UI (referencia)

Siguen apareciendo en el CSS (botones, logout, estados en listados — p. ej. infracciones vehiculares —, etc.):

| Rol | Ejemplos (light / tal cual en CSS) |
|-----|-------------------------------------|
| Primario | `#007dbf` → hover `#005d8f` → active `#003754` |
| Danger / logout | `#bf0000` → `#8f0000` → `#540000` |
| Estados (listados) | `due` rojo, `paid` verde, `dismissed` turquesa, `noData` naranja |

---

## Paleta dark “material” (referencia opcional)

Si en el futuro se quiere alinear todo a una escala fija (no es obligatorio; hoy **`--surface-card` en dark es `#121212`**):

- Fondo app general: tonos cercanos a `#0b1220` / `#121212`
- Superficie elevada: `#17233d` o variaciones sobre `#121212`
- Borde: `#25324a`

---

## Ejemplo de tokens (CSS) — alineado con la implementación actual

```css
:root {
  --text: #000000;
  --surface-card: #ffffff;
  --text-muted: #6b7280;
  --border-card: rgba(128, 128, 128, 0.2);
  /* ... ver sistema.css para el resto */
}

html[data-bs-theme="dark"] {
  color-scheme: dark;
  --text: #e6eaf2;
  --surface-card: #121212;
  --text-muted: #94a3b8;
  --border-card: #25324a;
  /* Bootstrap 5: --bs-body-bg, --bs-body-color, ... */
}

html[data-bs-theme="light"] {
  --bs-body-bg: #ffffff;
  --bs-body-color: #212529;
  --bs-border-color: #dee2e6;
  --bs-heading-color: inherit;
}
```

Para cambiar el aspecto global en dark, el punto más sensible es **`--surface-card`** (tarjetas, filtros, perfil) y las variables **`--bs-*`** en el mismo bloque `html[data-bs-theme="dark"]`.
