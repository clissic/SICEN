---
name: searchable-combobox-pattern
description: Combobox accesible con buscador interno (input readonly + chevron + popover con búsqueda y lista filtrada) para elegir un valor de un catálogo finito o de una colección cargada del backend. Usar siempre que un formulario de SICEN deba ofrecer un dropdown con muchas opciones (buques, marcas, unidades, países, catálogos) y se necesite búsqueda parcial, navegación con teclado y soporte claro/oscuro coherente con el resto del UI.
---

# Combobox con buscador interno

El proyecto evita usar `<select>` nativo cuando el catálogo tiene más de
~10 opciones o requiere búsqueda. En esos casos se arma un combobox con
**input readonly**, **botón chevron** para abrir/cerrar y un **popover** con
**buscador** y **lista filtrada**. Comparte estilos para mantener
consistencia entre módulos (multas, buques, inspecciones, etc.).

## Ejemplos vivos en el repo

| Componente | Ruta | Caso de uso |
|---|---|---|
| `CarBrandCombobox` | `SICEN-front/src/components/CarBrandCombobox.jsx` | Catálogo **estático** de marcas de vehículo (`constants/carBrands.js`) + opción final `Otra`. |
| `VesselUltramarCombobox` | `SICEN-front/src/components/VesselUltramarCombobox.jsx` | Catálogo **dinámico**: trae los buques de Ultramar desde `GET /api/vessels/by-type/Ultramar` y deja elegir uno por OMI o nombre. |
| `InspectorCombobox` | `SICEN-front/src/components/InspectorCombobox.jsx` | Catálogo **dinámico filtrado**: trae todos los usuarios con `usersGetAll()` y deja sólo los **OSERP activos** (state "Oficial Supervisor por el Estado Rector de Puertos" + `isActive: true`). Devuelve el **email** como valor. Soporta `disabled`, `disabledPlaceholder` y `excludedEmails` (uso multi-select: los emails listados ahí desaparecen del desplegable, ideal para armar arrays sin duplicados desde el padre). |

## Reglas obligatorias

1. **No usar `<select>` nativo** para más de ~10 opciones o cuando se
   necesita búsqueda. Se construye un combobox como los del listado.
2. **Input principal `readOnly`** que muestra el valor elegido y abre el
   popover al hacer clic o recibir foco; al lado, **botón chevron** que
   alterna `bi-chevron-down` / `bi-chevron-up`.
3. **Popover dentro del mismo contenedor** (`position-absolute`), con:
   - **Input de búsqueda** arriba (con `placeholder` específico, p. ej.
     "Buscar marca…", "Buscar por OMI o nombre…").
   - **Lista `role="listbox"`** debajo, scroll vertical y `max-height` en
     CSS (~260–280px).
   - Cada item es un `<button type="button" role="option">` con
     `data-idx={idx}`.
4. **Soporte de teclado obligatorio**: ↓ abre y avanza, ↑ retrocede, Enter
   selecciona el item resaltado, Esc cierra el popover.
5. **Cierre por clic afuera** mediante `useEffect` que agrega/quita
   `mousedown` en `document`.
6. **Búsqueda insensible a diacríticos y a mayúsculas**: usar
   `normalizeForSearch` (existe en `constants/carBrands.js` y se replica
   en cada combobox dinámico).
7. **Estilos compartidos** desde `SICEN-front/src/styles/`:
   - Para catálogos genéricos / nuevos: usar **`vessel-combobox.css`** y
     las clases `vessel-combobox*`. Es genérico (a pesar del nombre); se
     puede renombrar si hace falta cuando aparezca un tercer uso.
   - `car-brand-combobox.css` es el origen histórico y se mantiene para
     `CarBrandCombobox`. No usarlo para componentes nuevos.
   - Ambos archivos respetan `var(--bs-body-bg)`, `var(--bs-body-color)`,
     etc., por lo que el modo oscuro funciona sin código extra.
8. **`onChange` doble cuando hay datos completos**: si la opción es un
   objeto con varios campos (no sólo un string), exponer
   `onChange(valueId, fullDoc)` para que el padre pueda mostrar info
   adicional sin volver a consultarla.
9. **Estados de carga y error en el dropdown dinámico**:
   - Mientras carga, deshabilitar el input principal y mostrar
     "Cargando…" como placeholder.
   - Si falla el fetch, mostrar el mensaje con `text-danger small` debajo
     del input (no romper el render del formulario).
10. **Importar los estilos en `main.jsx`** una sola vez (ya están
    enganchados `car-brand-combobox.css` y `vessel-combobox.css`).

## Antipatrones a evitar

- ❌ Usar `<select>` con cien opciones y dejar que el usuario haga
  scroll-sin-buscador.
- ❌ Reescribir un combobox con búsqueda desde cero en lugar de copiar
  `VesselUltramarCombobox` y adaptar el fetch.
- ❌ Cerrar el popover con `onBlur` del input principal (rompe el clic
  sobre las opciones en algunos navegadores). Usar siempre el listener
  de `mousedown` sobre el documento.
- ❌ Hardcodear colores en el CSS del combobox; tienen que venir de
  variables Bootstrap para mantener el tema claro/oscuro.
- ❌ Mostrar sólo el "nombre" cuando hay un identificador único más
  representativo (OMI, sigla, código). El formato canónico es
  **`<identificador> — <nombre>`** (espacio + em dash + espacio).

## Template para un combobox dinámico (catálogo desde la API)

```jsx
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { fetchSomething } from "../api/client.js";

function normalizeForSearch(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function SomethingCombobox({ id, value, onChange, required = false }) {
  const reactId = useId();
  const inputId = id || `something-${reactId}`;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchSomething()
      .then((data) => {
        if (cancelled) return;
        setItems(data?.items ?? []);
      })
      .catch((e) => !cancelled && setError(e?.message || "Error de carga"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return items;
    return items.filter((it) =>
      normalizeForSearch(`${it.id} ${it.name}`).includes(q)
    );
  }, [query, items]);

  // ...resto: click-outside, navegación teclado, render del popover...
  // Ver `VesselUltramarCombobox.jsx` para la versión completa.
}
```

## Cuándo NO crear un combobox

- Catálogos con ≤10 opciones estáticas que no necesitan búsqueda → usar
  `<select>` nativo.
- Selección múltiple con tags / chips → ese flujo requiere otro patrón
  (multi-select); este skill cubre selección **única**.
