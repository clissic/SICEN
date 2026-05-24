---
name: iframe-modal-pattern
description: Embebe un sitio externo dentro de un modal con iframe en SICEN-front usando el componente reutilizable IframeModal. Usar cuando una tarjeta de menú, botón o enlace deba abrir un sitio de terceros (CIALA, JPC, sistemas externos, herramientas, etc.) sin sacar al usuario del SPA, manteniendo la misma estética del modal de "Desarrollado por JPC".
---

# Patrón de modal con iframe externo

En SICEN, cuando una opción del producto deba abrir un sitio externo sin
hacer perder el contexto del SPA, **se debe usar el componente reutilizable
`IframeModal`** (`SICEN-front/src/components/IframeModal.jsx`). Ningún
módulo nuevo debería re-crear el modal con iframe desde cero ni copiar los
estilos `iframe-modal*` por afuera del componente.

## API del componente

Archivo: `SICEN-front/src/components/IframeModal.jsx`
Estilos: `SICEN-front/src/styles/iframe-modal.css` (los importa el componente).

```jsx
import { IframeModal } from "../components/IframeModal.jsx";
```

| Prop | Tipo | Descripción |
|---|---|---|
| `open` | `bool` (requerido) | Controla la visibilidad. |
| `onClose` | `() => void` (requerido) | Se invoca al cerrar (Esc, clic en backdrop o botón ✕). |
| `url` | `string` (requerido) | URL embebida en el iframe **y** destino del botón "Abrir en pestaña". |
| `titleText` | `string` (requerido) | Texto del header. Formato sugerido: `"NOMBRE — dominio.com"` o `"NOMBRE — bajada breve"`. |
| `logoSrc` | `string` (opcional) | Logo del sitio para acompañar el título. Si no se pasa, se renderiza solo texto. |
| `logoInvertDark` | `bool` (default `true`) | Invierte el logo en modo oscuro (`brightness(0) invert(1)`). Dejar `true` para logos monocromáticos. |
| `ariaLabel` | `string` (opcional) | Override del `aria-label` del diálogo (por defecto usa `titleText`). |

El componente ya maneja por dentro: `Escape` para cerrar, bloqueo del scroll del
body, clic en backdrop para cerrar, spinner "Cargando…" mientras el iframe
no terminó de cargar, botón ✕ en la esquina superior derecha del diálogo y
botón "Abrir en pestaña" en el header.

## Reglas de uso

1. **Una sola fuente de verdad**: el modal de iframe siempre se monta a
   través de `<IframeModal>`. No reescribir el modal con `bootstrap.Modal`,
   `Swal`, `<dialog>`, ni divs ad-hoc.
2. **Sandbox**: el iframe usa
   `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"`.
   Si un sitio puntual exige más permisos, **extender la prop del
   componente** en lugar de duplicar el modal.
3. **Botón "Abrir en pestaña"**: ya está incluido. Apunta a `url`. No
   agregar enlaces externos adicionales en la página que invoca el modal.
4. **Disparo desde una tarjeta de menú**: la tarjeta debe ser un
   `<button type="button">` con `aria-label` claro (ej.
   `"Abrir CIALA en una vista previa"`); reutilizar los mismos estilos de
   tarjeta (`card h-100 shadow-sm`, `menu-tile-icon`, etc.) que las demás
   tarjetas del hub. Usar el reset `background: transparent; border: 0;
   padding: 0; width: 100%; text-align: left;` para mantener el aspecto de
   `<Link>`.
5. **Logos opcionales**: si el sitio tiene un logo distintivo (JPC, CIALA),
   pasarlo en `logoSrc`. Si no, omitirlo: el header se ve igual de bien con
   sólo el texto.
6. **No crear rutas dedicadas** para abrir el iframe (ni `Navigate`, ni
   `placeholder pages`). El sitio se abre desde el botón y se cierra al
   modal; al cerrar, el usuario sigue en la misma URL del SPA.
7. **Sitios bloqueados con `X-Frame-Options` / `Content-Security-Policy`**:
   si al probar el modal el sitio rechaza ser embebido (pantalla en blanco
   o mensaje "rechazó la conexión"), **no insistir con el modal**.
   Convertir la tarjeta en un `<a href={URL} target="_blank"
   rel="noopener noreferrer">`, mantener exactamente el mismo aspecto de la
   tarjeta y agregar el ícono `bi bi-box-arrow-up-right` al lado del título
   (con `title="Se abre en otra pestaña"`) para que sea evidente que
   navega fuera del SPA. Ejemplo vivo: la tarjeta de CIALA en
   `EstadoRectorPuertosPage.jsx` (CIALA bloquea iframes vía
   `X-Frame-Options`).

## Template — tarjeta que abre el modal

```jsx
import { useState } from "react";
import { IframeModal } from "../components/IframeModal.jsx";
import { Layout } from "../components/Layout.jsx";

const SITE_URL = "https://sitio-externo.example/";
const CARD_BUTTON_RESET = {
  background: "transparent",
  border: "0",
  padding: 0,
  width: "100%",
  textAlign: "left",
};

export function HubPage() {
  const [open, setOpen] = useState(false);
  return (
    <Layout>
      {/* ...resto del hub... */}
      <button
        type="button"
        className="text-decoration-none d-block h-100"
        style={CARD_BUTTON_RESET}
        onClick={() => setOpen(true)}
        aria-label="Abrir SITIO en una vista previa"
      >
        <div className="card h-100 shadow-sm">
          {/* misma estructura que las demás tarjetas del hub */}
        </div>
      </button>

      <IframeModal
        open={open}
        onClose={() => setOpen(false)}
        url={SITE_URL}
        titleText="SITIO — dominio.example"
        logoSrc="/img/SITIOlogo.svg"
        ariaLabel="Sitio externo en una vista previa"
      />
    </Layout>
  );
}
```

## Template — fallback cuando el sitio bloquea iframes

```jsx
<a
  className="text-decoration-none d-block h-100"
  href={SITE_URL}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Abrir SITIO en una pestaña nueva"
>
  <div className="card h-100 shadow-sm">
    {/* misma estructura visual que las demás tarjetas del hub */}
    <div className="d-flex align-items-center gap-2 fw-semibold text-body">
      <span>SITIO</span>
      <i
        className="bi bi-box-arrow-up-right text-muted small"
        aria-hidden
        title="Se abre en otra pestaña"
      />
    </div>
    {/* bajada / subtítulo */}
  </div>
</a>
```

## Ejemplos vivos en el repo

- **Modal (sitio permite iframe)**: Footer "Desarrollado por JPC" en
  `SICEN-front/src/components/Layout.jsx` (`JPC_SITE_URL`, `IframeModal`
  con logo y título `"JPC — jpc-dev.uy"`).
- **Enlace externo (sitio bloquea iframe)**: tarjeta de CIALA en
  `SICEN-front/src/pages/EstadoRectorPuertosPage.jsx` (`CIALA_SITE_URL`
  con `target="_blank"` y `rel="noopener noreferrer"`).

## Antipatrones

- Copiar la estructura `modal fade show d-block ...` + `iframe` + backdrop
  en cada página. Si el patrón crece, **extender `IframeModal`**, no
  duplicarlo.
- Embeber un iframe inline en la página (`<iframe ... />` dentro del
  contenedor del hub) cuando lo esperable es un modal. Para vistas embebidas
  permanentes (Sistemas externos), seguir usando `ToolEmbedPage`.
- Crear una ruta `/.../sitio-externo` para mostrar el iframe en pantalla
  completa cuando el flujo ya pasa por una tarjeta del menú. La vista previa
  modal es suficiente y mantiene el contexto del SPA.
- Mantener clases legacy `jpc-iframe-modal*`: ya no existen; usar
  `iframe-modal*` (ver `styles/iframe-modal.css`).
