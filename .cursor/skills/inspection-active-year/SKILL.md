---
name: inspection-active-year
description: Filtro persistente de "ejercicio anual" para el módulo de Inspecciones (Estado Rector de Puertos). Usar siempre que una página dentro de `/estado-rector-puertos/inspecciones/*` (menú, alta, edición, eliminación, estadísticas, listados) necesite leer, mostrar o reaccionar al año que el usuario eligió en el menú de Inspecciones, o cuando se agregue un nuevo flujo dentro del módulo.
---

# Ejercicio anual activo en Inspecciones

Todas las consultas y estadísticas del módulo de Inspecciones se acotan al
**ejercicio anual** que el usuario elige en `InspectionsMenuPage`. El valor
vive en `localStorage` y se sincroniza entre páginas vía un evento custom.

## Convención "Ingreso" vs "Inspección"

Aunque viven en la misma colección `vesselInspections`, conceptualmente
hay **dos clases de registros**:

| `inspectionPerformed` | Significado de negocio | Quién lo ve |
|---|---|---|
| `false` | **Ingreso pendiente** — placeholder automático de Ultramar o arribo cargado a la espera de la diligencia. | Tabla "Ingresos sin inspección" + estadísticas de "ingresos" / cobertura. **No aparece** en los listados de inspecciones realizadas. |
| `true` | **Inspección realizada** — diligencia efectivamente ejecutada. | Tablas "Mis inspecciones" y "Todas las inspecciones del sistema" + todas las métricas de "inspecciones" / "deficientes". |

### Flujo de alta en dos pasos

Por decisión de UX, las pantallas separan claramente cada paso:

1. **"REGISTRO DE INGRESOS"** (`/inspecciones/nueva`, `CreateInspectionPage`):
 sólo registra el arribo. Persiste `vesselId`, `arrivalDate`,
 `arrivalPort`, `cialaPriority`, **siempre con `inspectionPerformed: false`**.
 No pide fecha de inspección, PDF ni deficiencias. El registro queda
 visible en la tabla "Ingresos sin inspección" del paso 2.
2. **"REGISTRO DE INSPECCIONES"** (`/inspecciones/modificar`,
 `ConsultInspectionsListPage`): lista los ingresos pendientes y las
 inspecciones realizadas en tres secciones. Tanto el botón
 **"Inspeccionar"** de cada ingreso pendiente como el botón
 **"Modificar"** de las inspecciones realizadas **abren el mismo modal**
 (`InspectionCompletionModal`), que detecta el modo a partir de
 `inspection.inspectionPerformed`:
 - **Modo `create`** (`inspectionPerformed: false`): título "Registrar
   inspección", header amarillo, formulario vacío con `inspectionDate`
   defaulteado a `arrivalDate`, sin PDF actual, sin deficiencias,
   inspector defaulteado al usuario logueado.
 - **Modo `edit`** (`inspectionPerformed: true`): título "Modificar
   inspección", header azul, todos los campos **precargados** desde el
   documento (incluyendo deficiencias y, si existe, el PDF actual con
   opción de descargar, reemplazar o quitar). El inspector preselecciona
   el primer email de `inspectors[]`; si coincide con el logueado el
   checkbox "La inspección la realizó el usuario" queda tildado, si no
   queda destildado con el combobox apuntando al inspector original.

 En ambos modos el PUT empuja `inspectionPerformed: true`, manda
 `inspectors: [emailFinal]` y refresca las tres secciones del listado vía
 un `refetchNonce` compartido. No existe una página `/modificar/:id`
 dedicada: todo sucede in-place sobre el listado a través del modal.

La regla es: la pantalla de alta **nunca** pide datos de la diligencia
(para no confundir el flujo), y el modal de inspección **siempre**
empuja `inspectionPerformed: true`, sirviendo tanto para registrar como
para editar inspecciones existentes.

### Reglas derivadas

1. **`CreateInspectionPage` siempre manda `inspectionPerformed: false`**
 + `inspectionDate: null` + `deficiencies: []`. No incluir UI para
 esos campos en esta pantalla.
2. **`InspectionCompletionModal`** (`SICEN-front/src/components/`)
 es el único lugar donde se setean `inspectionDate`, `deficiencies` y
 el PDF. Se abre desde la tabla "Ingresos sin inspección" y exige
 `inspectionDate` con `inspectionDate >= arrivalDate` (validación
 cliente). Al guardar manda el PUT y dispara `onSaved()` para que el
 listado padre refresque sus secciones.
3. **Listados**: filtrar siempre `inspectionPerformed: true|false`
 explícitamente en los params del paginado (`ConsultInspectionsListPage`
 lo hace para sus tres secciones, y `DeleteInspectionPage` fija
 `inspectionPerformed: true`). Nunca asumir el default del backend.
4. Las estadísticas de `getInspectionStats` ya separan `totalArrivals`
 (todos los registros con `arrivalDate`) de `totalInspections` (sólo
 los `inspectionPerformed: true`). No mezclar los términos en copys
 visibles.
5. Copys orientados al usuario:
 - ✅ "Registrar ingreso" → pantalla de alta (sólo arribo).
 - ✅ "Inspecciones" → realizadas.
 - ✅ "Ingresos sin inspección" → pendientes.
 - ❌ Nunca llamar "inspección" a un registro `inspectionPerformed: false`.

Helper único: `SICEN-front/src/utils/inspectionExercise.js`.

No leer ni escribir directamente el `localStorage` (`sicen_inspection_active_year`)
desde las páginas; siempre usar las funciones exportadas por el helper para
disparar el evento de cambio.

## API del helper

```js
import {
  currentExerciseYear,
  getActiveInspectionYear,
  setActiveInspectionYear,
  subscribeActiveInspectionYear,
} from "../utils/inspectionExercise.js";
```

| Función | Para qué sirve |
|---|---|
| `currentExerciseYear()` | Devuelve el año natural actual. Útil como fallback. |
| `getActiveInspectionYear()` | Lee el año persistido en `localStorage`. Devuelve `null` si nunca se eligió. |
| `setActiveInspectionYear(year)` | Persiste el año (acepta `null`/`""` para limpiar) y emite el evento `sicen:inspection-active-year-change`. |
| `subscribeActiveInspectionYear(cb)` | Suscribe `cb(year \| null)` a cambios y a cambios de `localStorage` cross-tab. Devuelve `unsubscribe`. |

## Reglas de uso

1. **Fallback obligatorio**. Como `getActiveInspectionYear()` puede ser `null`,
   resolver siempre con:

   ```js
   const year = getActiveInspectionYear() ?? currentExerciseYear();
   ```

2. **Suscripción en páginas que muestran el año**. Si la página renderiza el
   ejercicio activo o lo usa como filtro, suscribirse en un `useEffect` para
   que cambios desde otra pestaña o desde el menú se reflejen sin recargar.

3. **El menú es el único que `set`-ea por UI**. Cualquier otra página puede
   `set`-ear sólo si el usuario explícitamente cambia el ejercicio desde un
   control que esté ahí (no inferirlo automáticamente).

4. **Combinación con el backend**. El endpoint
   `GET /api/vesselInspections/years` devuelve los años con inspecciones
   registradas. El menú lo combina con `currentExerciseYear()` y con el año
   almacenado para garantizar que el `<select>` nunca quede vacío ni con
   opciones huérfanas (ver `buildYearOptions` en `InspectionsMenuPage`).

5. **No replicar para otras entidades sin generalizar**. Si OSERP u otro
   módulo necesita el mismo patrón anual, renombrar este skill a algo
   genérico (`active-exercise-year`) y mover el helper a una versión
   parametrizada (por ejemplo, `createExerciseYearStore(storageKey, eventName)`).
   Mientras tanto, este helper es exclusivo de Inspecciones.

## Antipatrones a evitar

- ❌ Leer `localStorage.getItem("sicen_inspection_active_year")` directo.
- ❌ Pasar el año por props desde el menú a cada página (no escala con el
  routing y se pierde al refrescar).
- ❌ Setear el año en un `useEffect` que dependa de cambios derivados (puede
  generar loops).
- ❌ Mostrar el año en un componente sin `subscribeActiveInspectionYear`
  cuando otras pestañas pueden cambiarlo.

## Template para una página del módulo

```jsx
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout.jsx";
import {
  currentExerciseYear,
  getActiveInspectionYear,
  subscribeActiveInspectionYear,
} from "../utils/inspectionExercise.js";

export function MiPaginaDeInspecciones() {
  const [year, setYear] = useState(
    () => getActiveInspectionYear() ?? currentExerciseYear()
  );

  useEffect(() => {
    return subscribeActiveInspectionYear((next) => {
      setYear(next ?? currentExerciseYear());
    });
  }, []);

  // ...usar `year` para filtrar consultas al backend
  return (
    <Layout>
      <p>Ejercicio activo: <strong>{year}</strong></p>
      {/* contenido filtrado por `year` */}
    </Layout>
  );
}
```

## Relación con el alta de buques (placeholders automáticos)

Al dar de alta un buque de **Ultramar** (`POST /api/vessels`) el backend crea
automáticamente un registro en `vesselInspections` con
`inspectionPerformed: false`, `arrivalDate: null`, `inspectionDate: null`,
`arrivalPort: ""`, `cialaPriority: ""`. Función responsable:
`createPlaceholderInspectionForVessel` en
`SICEN-back/src/services/vesselInspections.service.js`.

Implicancias para los consumidores:

- El endpoint `GET /api/vesselInspections/years` ignora los placeholders
  (filtra `arrivalDate` con tipo `date`), así que el desplegable del menú
  sigue siendo limpio.
- Toda página que liste o estadística inspecciones debe contemplar que
  `arrivalDate`, `inspectionDate` y `arrivalPort` pueden ser `null`/`""`.
  Mostrar "—" o "Sin inspección" en esos casos en vez de romper el render.
- Al armar el formulario manual de alta/edición, si el usuario marca
  `inspectionPerformed: true` validar en el front que `arrivalDate`,
  `inspectionDate` y `arrivalPort` estén completos, y que
  `inspectionDate >= arrivalDate` (el backend dejó la regla floja a
  propósito para habilitar los placeholders).
- **Fechas separadas (`arrivalDate` vs `inspectionDate`)**:
  `arrivalDate` es el día en que el buque ingresó al puerto (alimenta
  CIALA, cobertura, ejercicio anual y `listInspectionYears`).
  `inspectionDate` es el día en que efectivamente se realizó la
  diligencia (suele coincidir, pero puede ser posterior). El ejercicio
  anual y todas las estadísticas siguen indexados por `arrivalDate`;
  `inspectionDate` se persiste para reporting operativo y se muestra
  como columna extra en `ConsultInspectionsListPage`. Si en el futuro
  el negocio pide ejercicios por fecha de inspección, hay que cambiar
  tanto `listInspectionYears` como `getInspectionStats`.
- **Absorción del placeholder en `POST /api/vesselInspections`**: si para
  el `vesselId` indicado ya existe un registro con `arrivalDate: null`
  (el placeholder automático), `createInspection` **lo actualiza** en
  lugar de crear un documento nuevo (`createdBy` se preserva). Esto evita
  que el primer ingreso real del buque deje colgado el placeholder.
  Comportamiento ubicado en
  `SICEN-back/src/services/vesselInspections.service.js#createInspection`.
- **Catálogos fijos del formulario**: el alta/edición de inspecciones usa
  desplegables nativos para `arrivalPort` y `cialaPriority`. Las opciones
  viven en `SICEN-front/src/constants/inspectionFormOptions.js`
  (`URUGUAY_ARRIVAL_PORTS` y `CIALA_PRIORITY_OPTIONS`). Si hay que sumar un
  puerto u otra prioridad, agregarlo ahí; las estadísticas asumen ese set
  acotado.
- **PDF de inspección (`inspectionPDF`)**: campo opcional del esquema con
  la **URL pública** del PDF asociado (`/uploads/inspectionsERP/<_id>.pdf`).
  Los archivos físicos se guardan fuera de `public/` en
  `SICEN-back/storage/inspectionsERP/` y se sirven con `express.static`.
  Helpers: `renameInspectionPdfByInspectionId` y
  `deleteStoredInspectionPdf` (`SICEN-back/src/utils/inspectionPDFFiles.js`).
  Middleware: `uploadInspectionPdf` (campo `inspectionPDF`, ≤ 1 MB, solo
  `.pdf`). En `POST /api/vesselInspections` y `PUT /:id` el archivo viene
  como multipart y, después de obtener el `_id` definitivo, se renombra a
  `<_id>.pdf`. En `PUT /:id`, mandar `removeInspectionPDF: true` (sin
  archivo) borra el PDF existente. En `DELETE /:id`, el PDF asociado se
  borra del disco junto con el documento.
- **Inspectores (`inspectors`)**: array de emails (lowercase) que registra
  quiénes realizaron la diligencia. **El esquema soporta multi-firma** y
  el modal lo aprovecha: cada inspección puede tener uno o varios
  inspectores. Hay dos formas de llenar el array:
  1. **Explícita desde el cliente** — `InspectionCompletionModal` siempre
     manda `inspectors: [...]` en el PUT con la lista completa que el
     usuario armó. La UI muestra una lista de "chips" con los inspectores
     ya agregados (cada uno con botón "Quitar") y debajo el
     `InspectorCombobox` para sumar uno más. El combobox **excluye** los
     que ya están en la lista (prop `excludedEmails`) para evitar
     duplicados. En modo creación se precarga con `[req.user.email]`
     (usuario logueado) por comodidad, pero se puede quitar y agregar a
     otros. En modo edición se precarga con el array completo del
     documento.
  2. **Auto-tagging del backend** — si en una futura integración alguien
     envía un PUT/POST sin `inspectors`, `updateInspectionById` (y
     `createInspection`) agrega `req.user.email` al detectar la
     transición `inspectionPerformed: false → true`. Sirve como red de
     seguridad para integraciones (scripts, importadores) y no debe
     usarse desde el modal humano.

  Para **mostrar** inspectores en el front usar siempre
  `SICEN-front/src/components/InspectorBadge.jsx` (fuente única). Expone:
  - `<InspectorsCell inspectors usersByEmail />` — renderiza una franja
    horizontal con un badge `bi-person-badge` por inspector y popover
    (hover/foco) con Rango, Apellido y Nombre, más unidad/email como
    subtítulo. Si la inspección no tiene `inspectors` poblado muestra un
    guion neutro. Se usa en `ConsultInspectionsListPage` ("Todas las
    inspecciones del sistema") y en `DeleteInspectionPage` (columna
    "Inspector").
  - `<InspectorBadge email user />` — un solo badge, para usos sueltos.
  - `inspectorPlainLabel(email, user)` — string "Rango Apellido, Nombre"
    para contextos sin React (ej.: el `summaryHtml` de un Swal de
    confirmación, donde el popover no funciona). En `DeleteInspectionPage`
    se usa `inspectorsPlainList()` armado sobre este helper para el
    diálogo de eliminación.
  - `userFullName(user)` — "Apellido, Nombre" puro, sin rango.

  Si el email no resuelve a un usuario conocido (dado de baja, registro
  legacy), `InspectorBadge` cambia a la variante visual `is-unknown` y
  el popover muestra "Inspector no encontrado" con el email crudo. Para
  resolver los nombres, todas las pantallas hacen lo mismo: una sola
  llamada a `usersGetAll()` al montar y armar un `Map<email, user>` que
  se pasa como prop. Nunca romper el render por una atribución legacy.

  Estilos en `SICEN-front/src/styles/inspector-badge.css` (importado
  desde `main.jsx`); respetan variables Bootstrap para tema claro/oscuro.

  Para **elegir** un inspector, usar `InspectorCombobox`
  (`SICEN-front/src/components/InspectorCombobox.jsx`): filtra a OSERP
  activos (mismo criterio que `byInspector`), acepta `excludedEmails`
  para uso multi-select y devuelve el email.
- **Filtro por día exacto (`inspectionDate`)**:
  `GET /api/vesselInspections/paginated?inspectionDate=YYYY-MM-DD` lista
  sólo las inspecciones realizadas ese día. El service construye internamente
  el rango `[día 00:00, día siguiente 00:00)` en hora local del servidor.
  Es el filtro que usa `DeleteInspectionPage` y puede combinarse con
  `search` (OMI/nombre del buque) — ninguno de los dos es obligatorio.

## Ejemplos vivos en el repo

- `SICEN-front/src/pages/InspectionsMenuPage.jsx` — origen del flujo: tarjeta
  "Ejercicio actual" con `<select>` poblado por `vesselInspectionYears()` +
  fallback al año en curso.
- `SICEN-front/src/pages/CreateInspectionPage.jsx` — formulario de
  **"Registrar ingreso"** (tarjeta "REGISTRO DE INGRESOS"). Lee el
  ejercicio activo en `useState` inicial, se suscribe con
  `subscribeActiveInspectionYear` y lo muestra en el header. Usa
  `VesselUltramarCombobox` para elegir el buque y
  `createVesselInspection` para enviar `vesselId`, `arrivalDate`,
  `arrivalPort` y `cialaPriority`; siempre fuerza
  `inspectionPerformed: false`, `inspectionDate: null` y
  `deficiencies: []`. **No** pide fecha de inspección, PDF ni
  deficiencias: eso es responsabilidad del formulario de edición.
- `SICEN-front/src/pages/ConsultInspectionsListPage.jsx` —
  "Consultar y modificar inspecciones". Tres secciones independientes:
  **Mis inspecciones** (`mine=true, performed=true`, filtra contra el
  array `inspectors`, NO contra `createdBy`),
  **Ingresos sin inspección** (`performed=false`) y
  **Todas las inspecciones del sistema** (`performed=true`). El botón
  "Inspeccionar" de la segunda abre `InspectionCompletionModal`; al
  guardar, un `refetchNonce` compartido fuerza el re-fetch de las tres
  secciones. Ver skill `paginated-search-table-pattern` para reglas
  generales del patrón.
- `SICEN-front/src/components/InspectionCompletionModal.jsx` — modal
  Bootstrap manual (sin `bootstrap.Modal` JS) con backdrop, cierre por
  Escape y bloqueo de scroll del body. **Funciona en dos modos**
  (deducidos de `inspection.inspectionPerformed`):
  `create` (registrar la diligencia sobre un ingreso pendiente) y
  `edit` (modificar una inspección ya realizada, con todos los campos
  precargados). Resumen read-only del buque, inputs de fecha de
  inspección (con `min={arrivalDate}`), PDF (≤ 1 MB) con manejo de
  "PDF actual" + acciones "Quitar" / "Deshacer" / "Reemplazar" en
  modo edición, **inspectores** (lista de "chips" que el usuario arma
  agregando entradas desde el `InspectorCombobox`; soporta multi-firma)
  y lista dinámica de deficiencias. Usa `updateVesselInspection(id,
  payload, pdfFile)` enviando `inspectors: [...]` explícito con todos
  los emails agregados, agrega `removeInspectionPDF: true` si se quitó
  el PDF actual sin subir uno nuevo, y notifica con SweetAlert2.
- `SICEN-front/src/components/InspectorCombobox.jsx` — combobox buscable
  para elegir un OSERP. Trae todos los usuarios con `usersGetAll()` y
  filtra a los que tienen el `state` "Oficial Supervisor por el Estado
  Rector de Puertos" con `isActive: true`. El valor expuesto es el
  email (lowercase). Soporta `disabled` sin perder el valor seleccionado
  y `excludedEmails` para uso en multi-select (los inspectores ya
  agregados desaparecen del listado). Reusa los estilos
  `vessel-combobox*`.
- `SICEN-front/src/pages/DeleteInspectionPage.jsx` — pantalla admin
  ("ELIMINAR" del menú). Doble filtro opcional: OMI/nombre del buque
  (`search`) + fecha exacta (`inspectionDate`); ninguno es requerido. La
  tabla muestra Buque, Fecha de inspección, Puerto, Inspector (resuelto
  con `usersGetAll()` a "Rango Apellido, Nombre") y un botón Eliminar
  por fila que dispara el flujo del skill `delete-flow-pattern`
  (`confirmDelete` + `notifyDeleteSuccess`/`notifyDeleteError`). Sólo
  consulta inspecciones realizadas (`inspectionPerformed: "true"`) y, a
  diferencia de las otras pantallas del módulo, **no acota por ejercicio
  anual**: el operador puede borrar inspecciones de cualquier año.
- `SICEN-front/src/pages/InspectionsPlaceholderPage.jsx` — pantalla
  provisional que muestra el ejercicio activo y se suscribe a sus cambios.
- Backend: `GET /api/vesselInspections/years` →
  `SICEN-back/src/services/vesselInspections.service.js#listInspectionYears`.
- Backend: `GET /api/vesselInspections/paginated` →
  `listInspectionsPaginated`. Acepta `page`, `limit`, `vesselId`,
  `arrivalPort`, `inspectionPerformed`, `year`, `search` (OMI/nombre del
  buque), `createdBy` (auditoría: quien cargó el registro),
  `inspectorEmail` (quien firmó la diligencia, match contra el array
  `inspectors`), `mine` (lo resuelve a `inspectorEmail: req.user.email`,
  **no** a `createdBy`), `inspectionDate` (día exacto, `YYYY-MM-DD`) e
  `includePlaceholders`. Por defecto excluye placeholders
  (`arrivalDate: { $type: "date" }`).
- Backend: `GET /api/vesselInspections/stats?year=<n>` →
  `SICEN-back/src/services/vesselInspections.service.js#getInspectionStats`.
  Devuelve `totalArrivals`, `totalInspections`, `byPriority`
  (`p1`, `p2`, `noPriority` con `arrivals`, `inspections`, `deficient`,
  `deficientPct`), `byInspector` (sólo OSERP activos, cada uno con `count`
  total, `countP1` y `countP2`), `topPorts` (top 5 ordenado por cobertura
  P1: `{ port, p1Arrivals, p1Inspections, p1CoveragePct }` y filtrado a
  puertos con al menos un ingreso P1), `topDeficiencies`, totales de
  deficiencias y de inspecciones con IGS. Excluye placeholders al filtrar
  por `arrivalDate` de tipo `date`. La normalización CIALA acepta sólo
  Prioridad 1 y Prioridad 2; cualquier otro texto se agrupa en `noPriority`.
- **Atribución del ranking `byInspector`**: cada inspección se reparte
  **exclusivamente** entre los emails únicos de su array `inspectors`.
  `metadata.createdBy` NO se usa como fallback: si una inspección quedó
  sin `inspectors` poblado, se cuenta en `totalInspections` y en el
  bucket de prioridad pero no aporta al ranking de nadie. Cuando hay
  varios inspectores en la misma diligencia (caso de dos OSERP firmando)
  cada uno suma 1 a sus contadores `count`/`countP1`/`countP2`, mientras
  que el total general sigue contando la inspección una sola vez. Si en
  el futuro se agrega selección múltiple en `InspectorCombobox` este
  comportamiento ya queda correcto sin tocar el service.
  **Atribución de `byInspector`**: cada inspección suma 1 a cada email
  único de su array `inspectors`. Si la inspección tiene varios inspectores
  (caso multi-firma), cada uno suma de manera independiente. Para
  registros previos a la feature (donde `inspectors` está vacío), el
  service cae a `metadata.createdBy` para no perder atribución histórica.
- Frontend: `InspectionsMenuPage` consume `vesselInspectionsStats(year)`
  cada vez que cambia `selectedYear` y renderiza la sección "Estadísticas
  del ejercicio".
- Placeholder automático al crear buque Ultramar →
  `SICEN-back/src/services/vessels.service.js#createVesselInitial`
  + `SICEN-back/src/services/vesselInspections.service.js#createPlaceholderInspectionForVessel`.
