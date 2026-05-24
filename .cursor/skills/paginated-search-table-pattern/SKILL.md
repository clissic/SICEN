---
name: paginated-search-table-pattern
description: Listado paginado con buscador en SICEN-front (input + tabla + paginación + estado loading/error). Usar siempre que se construya o modifique una pantalla que muestra registros traídos por un endpoint paginado del backend (AllShipsPage, AllUsersPage, AllShipFinesPage, ConsultInspectionsListPage, etc.) o se agregue una nueva entidad con búsqueda y paginación.
---

# Tabla paginada con buscador

Patrón unificado para pantallas de "consultar / modificar / eliminar"
basadas en un endpoint paginado del backend. Todas las páginas siguen el
mismo esqueleto para que el usuario encuentre los controles donde espera.

Backbone:

- `GET /api/<entidad>/paginated` que devuelve `{ docs, totalDocs,
 totalPages, page, limit, hasPrevPage, hasNextPage, prevPage, nextPage }`
 (forma de `mongoose-paginate-v2`).
- Helper en `SICEN-front/src/api/client.js` que arma `URLSearchParams`
 saltando claves con `value` `undefined`/`null`/`""`.
- Página React que mantiene `searchInput` (lo que el usuario tipea) y
 `appliedSearch` (lo que disparó el último `Buscar`).

## Reglas obligatorias

1. **No buscar en cada keystroke.** El refetch se dispara cuando el
 usuario hace submit del form o presiona Enter. El estado `searchInput`
 se mantiene aparte del `appliedSearch` justamente para esto. Esto evita
 hammering del backend.

2. **Excluir placeholders y datos parciales por defecto.** Si el listado
 muestra registros "reales" (p. ej. inspecciones realizadas), el backend
 debe filtrar los placeholders/borradores salvo flag explícito
 (`includePlaceholders=true`).

3. **`limit` fijo por contexto.** Cada página decide su `PAGE_SIZE`
 (constante al tope del archivo, normalmente 5, 10 o 20). El backend
 acepta `limit` pero clampea a un máximo razonable (50 en
 inspecciones/buques).

4. **Reset de página al cambiar filtros.** Cualquier cambio en
 `appliedSearch` o filtros aledaños debe llamar `setPage(1)` en el mismo
 handler. No esperar al próximo render.

5. **`useEffect` con `cancelled`.** El fetch tiene que respetar el patrón
 de cleanup para evitar races al cambiar de filtro rápido:
 ```js
 useEffect(() => {
   let cancelled = false;
   // ...
   return () => { cancelled = true; };
 }, [deps]);
 ```

6. **Mensajes vacíos diferenciados.** Texto distinto para "no hay
 resultados con esta búsqueda" vs "no hay registros cargados". Ej.:
 *"No hay inspecciones que coincidan con la búsqueda."* /
 *"No registraste inspecciones en este ejercicio."*

7. **Copy en español rioplatense, sin detalles de implementación.** Ver
 rule `.cursor/rules/user-facing-copy.mdc`. Los textos visibles no deben
 nombrar campos del esquema (`metadata.createdBy`), endpoints, etc.

8. **Búsqueda case-insensitive y diacritic-friendly cuando aplica.** El
 backend usa `RegExp` escapando caracteres especiales. No reenviar el
 input crudo a Mongoose sin escape (riesgo de regex injection o de que
 el usuario rompa la búsqueda con un `*`).

9. **Botón de acción por fila siempre a la derecha** (`Modificar`,
 `Eliminar`, `Certificados`). Si la acción depende del flujo de la
 página, usar variantes de Bootstrap consistentes
 (`btn-outline-primary`, `btn-outline-danger`).

10. **Paginación inferior derecha** con `Anterior` / `página actual /
 total` / `Siguiente`. Botones deshabilitados con `disabled` cuando
 corresponde, nunca ocultos.

## Antipatrones a evitar

- ❌ Lanzar `vesselInspectionsPaginated` desde `onChange` del input
 (debounce o no, eso lo evita el patrón de submit).
- ❌ Mantener varios estados independientes para `loading`/`error` y olvidar
 limpiarlos al cambiar página o filtro.
- ❌ Hardcodear `limit` en el cliente y dejar el backend sin tope (un
 usuario malicioso puede pedir 10 000 docs).
- ❌ Mostrar `_id` o nombres de campos crudos al usuario; renombrar a
 columnas humanas (Buque, Fecha de ingreso, etc.).
- ❌ Olvidar el cleanup del `useEffect` (`cancelled`).

## Template (sección reutilizable)

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { miEntidadPaginated } from "../api/client.js";

const PAGE_SIZE = 5;

function MiSeccionPaginada({ extraFilters, title }) {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = { page, limit: PAGE_SIZE, ...extraFilters };
    if (appliedSearch) params.search = appliedSearch;

    miEntidadPaginated(params)
      .then((r) => { if (!cancelled) setData(r ?? null); })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e?.message || "No se pudo obtener el listado.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, appliedSearch, extraFilters]);

  function onSubmit(e) {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  }
  function onClear() {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  }

  // ... render con form + table + nav.pagination
}
```

## Backend: estructura recomendada del filtro

En el service:

```js
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listMisRegistrosPaginated({
  page, limit, search, mine, year, ...
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const emptyResult = { docs: [], totalDocs: 0, totalPages: 0,
                        page: safePage, limit: safeLimit,
                        hasPrevPage: false, hasNextPage: false,
                        prevPage: null, nextPage: null };

  const filter = { /* placeholders excluidos */ };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    const ids = await OtraColeccion.find({
      $or: [{ campo1: rx }, { campo2: rx }],
    }).select("_id").lean();
    if (ids.length === 0) return emptyResult;
    filter.ref = { $in: ids.map((x) => x._id) };
  }
  // ...
  return Modelo.paginate(filter, { page: safePage, limit: safeLimit,
                                   sort: { ... }, populate: { ... } });
}
```

En el controller, parsear booleanos con un helper compartido y devolver
`{ ok: true, ...result }` plano (para que el front lea `r.docs` y
`r.totalDocs` sin destructuring extra).

## Ejemplos vivos en el repo

- `SICEN-front/src/pages/ConsultInspectionsListPage.jsx` — tres
 secciones (`mine: true, performed: true`; `performed: false`;
 `performed: true`), `PAGE_SIZE = 5`, reacciona al ejercicio anual
 activo y refresca todas las tablas con un `refetchNonce` compartido
 cuando el modal de inspección guarda.
- `SICEN-front/src/pages/DeleteInspectionPage.jsx` — variante con dos
 filtros opcionales combinables (OMI/nombre + `inspectionDate` exacto),
 no lista nada hasta que el usuario aprieta "Buscar" (estado
 `hasSearched`), tabla con botón "Eliminar" por fila vía
 `confirmDelete`. Buen ejemplo de cuándo NO precargar resultados.
- `SICEN-front/src/pages/AllShipsPage.jsx` — patrón base con filtros
 múltiples (tipo de buque, OMI, matrícula, puerto), `pageSize: 10`,
 maneja además flujo de eliminación con `confirmDelete`.
- `SICEN-front/src/pages/AllUsersPage.jsx` — listado de usuarios con
 búsqueda + paginación.
- `SICEN-front/src/pages/AllShipFinesPage.jsx`,
 `AllCarFinesPage.jsx`, `AllPersonalFinesPage.jsx` — mismo patrón para
 multas, incluyendo descarga de archivos asociados.
- Backend canónico:
 `SICEN-back/src/services/vesselInspections.service.js#listInspectionsPaginated`
 (params `search`, `mine` via `createdBy`, `year`, `inspectionDate`,
 `includePlaceholders`).
