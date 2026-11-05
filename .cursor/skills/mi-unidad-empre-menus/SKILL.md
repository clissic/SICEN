---
name: mi-unidad-empre-menus
description: >-
  Menús hijos de Mi Unidad exclusivos de EMPRE (P3 Control de fronteras y
  siguientes), la carga de números de patrulla y la Planificación mensual
  de unidades de línea. Usar al agregar una tarjeta bajo un ítem EMPRE, una
  ruta /mi-unidad/p3-planes-y-operaciones/control-de-fronteras/:menuSlug, al
  tocar Gestión de patrullas, Planificación mensual, borderPatrols,
  borderPatrolTypes, fulfillment o el desplegable de patrulla.
---

# Menús hijos de Mi Unidad (EMPRE)

Solo entra quien tiene `user.unit === "EMPRE"` (`isEmpreUnit`). El resto
vuelve a `/mi-unidad`.

## Catálogo

Fuente: `SICEN-front/src/constants/miUnidadEmpreDivisiones.js`.

- Divisiones P1–P6 en `MI_UNIDAD_EMPRE_DIVISIONES`.
- Un ítem de división puede tener `menuItems` (tarjetas hijas).
- Slugs fijos: `EMPRE_P3_SLUG`, `EMPRE_BORDER_SLUG`, `EMPRE_PATROLS_SLUG`.
- Resolver: `getMiUnidadEmpreNestedMenu(divisionSlug, itemSlug, menuSlug)`.

`MiUnidadEmpreDivisionItemPage` muestra tarjetas si `item.menuItems` tiene
elementos. Si no, el texto «Contenido en preparación».

## Ruta (no chocar con el menú genérico)

`/mi-unidad/:divisionSlug/:sectionSlug/:itemSlug` es de
`MiUnidadDivisionMenuItemPage`. Un hijo de Control de fronteras tiene la
misma cantidad de segmentos y, si cae ahí, redirige a Mi Unidad.

La ruta de estos menús lleva **dos segmentos estáticos** para que React
Router la prefiera:

```jsx
<Route
  path="/mi-unidad/p3-planes-y-operaciones/control-de-fronteras/:menuSlug"
  element={
    <ProtectedRoute>
      <MiUnidadEmpreBorderMenuPage />
    </ProtectedRoute>
  }
/>
```

Registrarla **antes** de las rutas dinámicas de `/mi-unidad`. El enlace de
la tarjeta es `/mi-unidad/${division.slug}/${item.slug}/${child.slug}`.

## Template de un menú nuevo

1. Agregar el objeto en `menuItems` del ítem padre (título, subtítulo,
   `iconClass`, `slug` estable).
2. En `MiUnidadEmpreBorderMenuPage`, si el `menuSlug` es el nuevo, renderizar
   su pantalla. Si no está resuelto en el catálogo, volver a Control de
   fronteras.
3. No reutilizar `MiUnidadDivisionMenuItemPage` para estos slugs.

## Ejemplo vivo: Gestión de patrullas

- Pantalla: `SICEN-front/src/pages/MiUnidadEmprePatrolsPage.jsx`.
- Pestaña **Planificación**: calendario del mes. Cada día muestra el nombre
  arriba a la izquierda, el número del día grande arriba a la derecha, y el
  total de patrullas fluviales y terrestres (marca azul y marrón; en modo
  claro esos tonos son más claros). **Totales:** muestra Fluvial y Terrestre
  con el número y la palabra en la misma línea. **Cumplidas:** PRENA y COMFLO,
  del mismo ancho, en 0 si no hay. En 0 la línea de color se apaga en modo
  claro y en modo oscuro. El día, Totales y Cumplidas quedan separados
  por una línea fina. Colores de Gran Mando guardados en
  `highCommands.js`: PRENA negro, COMFLO rojo, DIPER blanco, DIGFA azul,
  DIMAT verde, ESMAY amarillo. En modo oscuro la línea de PRENA se aclara
  para que se vea. Los días anteriores a hoy tienen
  un gris claro en modo claro y un gris oscuro en modo oscuro, cerca del
  fondo de la página. El día de hoy lleva borde verde (verde en modo claro,
  verde oscuro en modo oscuro) y sigue igual de clickeable que el resto. El
  título del mes abre un modal con mes y año para ir directo a esa fecha.
  Los botones Cancelar, Hoy e Ir tienen el mismo ancho; Hoy vuelve al mes
  actual. Al hacer clic en
  el día, debajo aparecen pestañas por unidad y, adentro, **Fluviales** y
  **Terrestres**, en una tabla con columnas Nro., Detalle, Estado,
  Observaciones y Acciones. El estado es solo el nombre, en color (amarillo
  planificada, verde cumplida, rojo incumplida; en modo claro esos tonos son
  más claros). Acciones: información (modal de lectura), modificar (modal
  compartido) y eliminar (`confirmDelete`).
- Modal de modificar (`BorderPatrolEditModal`): tres botones de estado del
  mismo ancho (warning / success / danger), observaciones siempre
  opcionales. Si el estado es **Cumplida**, pide el formulario de
  cumplimiento (`fulfillment`: matrícula, embarcaciones, personas,
  combustible, incidentes dinámicos + `incidentCount`, distancia, averías,
  personal). El **área** no se elige ahí: viene de la patrulla (snapshot
  al asignar) y se muestra solo de lectura. Mismo formulario para fluvial
  y terrestre por ahora.
- Pestaña **Estadísticas**: subpestañas **Combustibles**, **Registro diario**,
  **Registro semanal** y **Registro mensual** (semanal/mensual: a desarrollar).
  - **Combustibles**: consumo de patrullas **cumplidas**, orden año → mes →
    unidad → tipo. Navegación de año (flechas + modal). Total del año +
    grilla 2×2 por tipo (Super 95, Premium 97, 50S, 10S). Grilla de 12
    meses con total y la misma 2×2 compacta. Al elegir un mes: total, 2×2,
    barra de mezcla (porcentaje a 1 decimal **dentro** de cada
    segmento; tramos chicos ocultan la cifra y dejan popover),
    pestañas por unidad y barras por combustible.
    Colores: Super 95 amarillo, Premium 97 rojo, 50S gris, 10S azul
    (`nafta-super`, `nafta-premium`, `gasoil-comun`, `gasoil-especial`).
    Sin tinte de “calor” en tarjetas de mes.
    `GET /api/borderPatrols?year=` (sin month) trae el año completo.
    Componente: `BorderPatrolFuelStats.jsx`.
  - **Registro diario**: calendario del mes (misma estética que
    Planificación) para elegir el día. Debajo, KPIs del día (solo
    cumplidas): personal en la misión, averías, millas náuticas (fluviales),
    kilómetros (terrestres) y tabla por zona (mercantes, deportivas,
    pesqueros, embarcaciones registradas, personas identificadas): las 3
    zonas con el mismo ancho y Total al final. Cumplida fluvial pide MN; terrestre pide
    `distanceKm`. Componente: `BorderPatrolDailyRegistry.jsx`.
- Pestaña **Agregar patrulla**: unidad, tipo, patrulla (número y detalle, por
  ejemplo «1 - Terminal TCP hasta Acceso Norte») y fecha. Cada campo se
  habilita cuando el anterior tiene un valor. Sin unidad, Tipo muestra
  «Elegí la unidad». Si la unidad todavía no cargó números de ese tipo,
  Patrulla queda vacía. Debajo, la grilla muestra todos los días del mes.
  Cada columna de patrulla toma el ancho de su contenido y el encabezado
  es el número con F o T (`1F`, `2F` y después `1T`, `2T`). Al pasar el
  cursor, cada dato va en dos líneas: la clave chica (`Unidad:`, `Patrulla:`,
  `Detalle:`) y debajo el valor en negrita. La unidad muestra el nombre
  completo, la patrulla `#1 Fluvial` y el detalle del tramo. Día y Fecha se ajustan al texto.
  Si hay varias unidades, el resto scrollea en horizontal con un fade en
  el borde por donde queda contenido oculto. Celda `1` si hay asignación.
- La unidad de línea (cualquier usuario con esa sigla, no EMPRE) carga
  sus números en División I → Frontera → Patrullas de frontera
  (`/mi-unidad/division-i/frontera/patrullas-de-frontera`). Las patrullas
  se listan en dos pestañas de la mitad del ancho: **Fluviales** y
  **Terrestres**, cada una con su tabla (número, área, detalle, acciones).
  Al cargar o editar se pide número, tipo, **área** (`rio-uruguay` /
  `rio-de-la-plata` / `oceano-atlantico`) y detalle. Colección
  `borderPatrolTypes`. La clave única es `unitAcronym + number + kind`.
  Si al guardar (alta o edición hacia otro registro) ese número+tipo ya
  existe, un Swal advierte con tabla **Cargado / A cargar** (número,
  tipo, área, detalle) y, si confirma, hace `update` del existente.
  Al planificar, EMPRE copia `number`, `detail` y `area` en
  `borderPatrols`.
  `GET /api/borderPatrolTypes?unitAcronym=` lo ve EMPRE o la propia unidad.
  Alta, edición y baja solo la unidad dueña.
- **Planificación mensual** (línea): tarjeta en Frontera
  (`planificacion-mensual`), pantalla
  `MiUnidadPatrolPlanPage.jsx`. Calendario solo con patrullas de
  `user.unit` (día/fecha + Totales Fluvial/Terrestre). Al abrir el día,
  pestañas Fluviales/Terrestres (sin pestañas por unidad) y la misma
  tabla; Acciones: info + modificar (sin borrar).
- Cada unidad tiene Gran Mando (`highCommand`): COMFLO, PRENA, DIGFA, DIPER,
  ESMAY o DIMAT. Se elige al crear o modificar la unidad. En el calendario
  EMPRE, Cumplidas cuenta patrullas cumplidas de PRENA y de COMFLO.
- API `borderPatrols` (`guarded`):
  - `GET /` mes: EMPRE ve todas; unidad de línea solo las suyas.
  - `POST /` y `DELETE /:id`: solo EMPRE.
  - `PATCH /:id`: EMPRE (temporal) o la unidad dueña. Body: `status`,
    `observations` (≤ 500) y, si `status === fulfilled`, `fulfillment`
    validado. Al salir de Cumplida se conserva el historial de
    `fulfillment`. Índice único `unitAcronym + date + typeId`.

## Estado de la patrulla (temporal en EMPRE)

La unidad de línea cierra la patrulla desde Planificación mensual con el
formulario de Cumplida. EMPRE todavía puede editar el estado desde su
pantalla (mismo modal); eso sigue siendo **provisorio**. Cuando se retire
ese permiso, EMPRE solo planifica (alta/grilla).

## Antipatrones

- No colgar el menú hijo EMPRE en una ruta de tres parámetros dinámicos.
- No dejar el alta de una asignación sin el chequeo de unidad EMPRE en el
  servicio (el front solo no alcanza).
- No exigir `fulfillment` si el estado no es Cumplida.
- No usar el atributo `title` para hints; usar `data-sicen-popover`.
