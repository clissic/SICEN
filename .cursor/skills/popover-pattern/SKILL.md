---
name: popover-pattern
description: >-
  Reemplaza tooltips nativos HTML (atributo title) por popovers Bootstrap en
  SICEN-front vía data-sicen-popover y useDocumentSicenPopovers. Usar siempre
  que se agregue un hint al hover en botones, íconos, badges o textos truncados.
---

# Popovers en lugar de `title`

## Regla obligatoria

No usar el atributo HTML `title` como tooltip del navegador. Usar el sistema
SICEN de popovers Bootstrap.

```jsx
<button
  type="button"
  className="btn btn-sm btn-outline-secondary"
  data-sicen-popover="Confirmar"
  data-sicen-popover-placement="bottom"
  aria-label="Confirmar"
>
  <i className="bi bi-check-lg" aria-hidden />
</button>
```

| Atributo | Uso |
|---|---|
| `data-sicen-popover` | Texto del popover (obligatorio) |
| `data-sicen-popover-placement` | `top` (default), `bottom`, `left`, `right` |
| `aria-label` | Accesibilidad (recomendado en botones solo-ícono) |

## Infraestructura

- Hook: [`SICEN-front/src/hooks/useDocumentSicenPopovers.js`](SICEN-front/src/hooks/useDocumentSicenPopovers.js)
- Montado **una sola vez** en [`Layout.jsx`](SICEN-front/src/components/Layout.jsx)
- Bootstrap `Popover` + `MutationObserver` (alta/baja de nodos y cambio de atributo)
- `container: "body"`, `sanitize: true`
- Contenido leído en vivo desde el atributo (`content: () => el.getAttribute(...)`)

### Trigger: solo `hover`

```js
trigger: "hover"
```

**No** usar `focus` ni `hover focus`. Tras un click el botón conserva el foco y
dejaría el popover abierto; el usuario debe ver el tip solo al pasar el mouse
y cerrarlo al salir.

## Cuándo sí / cuándo no

### Convertir a `data-sicen-popover`

- Botones de acción con ícono (Confirmar, Eliminar, Renovar, Contacto, etc.)
- Badges / textos truncados que mostraban el valor completo al hover
- Íconos de ayuda (`Se abre en otra pestaña`, hints de campo)
- Campanita de notificaciones en **desktop** (sin label visible)
- Logout en **desktop** (solo ícono)

### NO convertir

- Props React llamadas `title` (`SectionCard`, encabezados de formulario,
  `FilesColumn`, etc.)
- `title` de `<iframe>` (accesibilidad / nombre del frame)
- Mensaje de validación HTML5 de un `input[pattern]`: usar
  `setCustomValidity` en `onInvalid` + `onInput` limpia; el hint visual va
  aparte con `data-sicen-popover`

```jsx
<input
  pattern="[A-Za-z0-9]{4,6}"
  data-sicen-popover="4 a 6 caracteres alfanuméricos"
  onInvalid={(e) => {
    e.currentTarget.setCustomValidity("4 a 6 caracteres alfanuméricos");
  }}
  onInput={(e) => e.currentTarget.setCustomValidity("")}
/>
```

## Campanita / menú mobile

- **Desktop:** botón solo-ícono + `data-sicen-popover="Notificaciones"`.
- **Mobile (menú chevron):** `NotificationsBell embedded` con label visible
  «Notificaciones»; **no** hace falta popover (el texto ya está en el botón).
  El panel de lista es expandible React, no un dropdown Bootstrap anidado
  (anidar dropdowns cierra el menú padre).

## Antipatrones

- No volver a `title=` en botones/íconos de acción.
- No montar `data-bs-toggle="popover"` a mano si ya hay `data-sicen-popover`
  (doble instancia).
- No usar `trigger: "focus"` / `"hover focus"` en el hook global.
- No reinventar un `useEffect` local por página para el mismo patrón (salvo
  popovers ya existentes con semántica propia, p. ej. vencimiento de
  certificados con `data-sicen-popover-content`).

## Template listo

```jsx
{/* Acción de tabla */}
<button
  type="button"
  className="btn btn-sm btn-outline-primary"
  data-sicen-popover="Confirmar arribo"
  aria-label="Confirmar arribo"
  onClick={onConfirm}
>
  <i className="bi bi-flag" aria-hidden />
</button>

{/* Texto truncado */}
<span className="text-truncate" data-sicen-popover={fullName}>
  {fullName}
</span>
```

## Ejemplos vivos

- Acciones DESPACHOS / ARRIBOS / DEMORADOS
- Tarjetas de multas (`CarFineCard`, `ShipFineCard`, `PersonalFineCard`)
- `NotificationsBell` (desktop) y logout en `Layout`
- `ProcedimientosFilesList`, `IframeModal` (enlace «abrir en pestaña nueva»)
- Sigla de unidad en `SumarUnidadPage` / `ModificarUnidadPage`
