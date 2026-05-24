---
name: delete-flow-pattern
description: Implementa la confirmación y feedback de cualquier eliminación de registros en SICEN usando SweetAlert2 a través del helper compartido (confirmDelete, notifyDeleteSuccess, notifyDeleteError). Usar siempre que se construya, modifique o revise un flujo para borrar un registro en SICEN-front (multas, usuarios, gente de mar, buques, unidades, catálogos, archivos, etc.) o cuando se agregue una nueva ruta DELETE en SICEN-back que requiera UI.
---

# Patrón de eliminación de registros en SICEN

Cualquier flujo que elimine un registro de la base de datos en SICEN
**debe** confirmarse mediante un `Swal.fire` construido con el helper
compartido `SICEN-front/src/utils/confirmDelete.js`. No se permiten modales
Bootstrap custom, `window.confirm`, ni eliminaciones sin confirmación previa.

## Helper compartido

Archivo: `SICEN-front/src/utils/confirmDelete.js`

```js
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteSuccess,
  notifyDeleteError,
} from "../utils/confirmDelete.js";
```

| Función | Para qué sirve |
|---|---|
| `confirmDelete({ resource, title?, summaryHtml?, summaryText?, extraNote? })` | Abre el Swal de confirmación. Devuelve un `SweetAlertResult`; comprobar `result.isConfirmed`. |
| `notifyDeleteSuccess(msg)` | Swal verde "Eliminado" con el mensaje devuelto por el backend. |
| `notifyDeleteError(err, fallback)` | Swal rojo "No se pudo eliminar" usando `err.message` / `err.data?.msg`. |
| `escapeHtml(value)` | Escapa texto plano antes de incrustarlo dentro de `summaryHtml`. |

`confirmDelete` ya aplica internamente: icono `warning`, botón confirmar
`#dc3545` "Sí, eliminar" a la derecha, botón "Cancelar" a la izquierda con
`focusCancel: true`, advertencia roja "Esta acción no se puede deshacer." y
contenido alineado a la izquierda. No reproducir esos valores manualmente.

## Reglas de uso

1. **Título**: usar `resource` con el nombre del registro en minúsculas y en
   singular (ej.: `"multa"`, `"buque"`, `"usuario"`, `"título del catálogo"`).
   Sólo usar `title` cuando el copy "¿Eliminar {resource}?" no aplique.
2. **Resumen**: preferir `summaryHtml` con una lista `<ul class="mb-2 ps-3">`
   que enumere los identificadores del registro (N° de multa, matrícula,
   nombre completo, código, etc.). Pasar siempre los valores dinámicos por
   `escapeHtml` para evitar inyección.
3. **Nota extra**: usar `extraNote` cuando la eliminación arrastre archivos
   asociados o restricciones del backend ("También se borrarán las fotos de
   prueba asociadas.", "No podrá eliminarse si hay usuarios asignados a esta
   sigla.", etc.).
4. **Feedback**: tras la llamada al endpoint, mostrar `notifyDeleteSuccess`
   en éxito y `notifyDeleteError` en error. No usar `Swal.fire` directo.
5. **Estado de UI**: deshabilitar el botón y mostrar `Eliminando…` con
   `spinner-border` mientras la petición está en curso (ver template).
6. **No modales custom**: no crear modales Bootstrap propios para confirmar.
   Tampoco usar `window.confirm`.

## Template de página/handler de eliminación

```jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteFoo, fooForDelete } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

export function DeleteFooPage() {
  const [preview, setPreview] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!preview) return;
    const result = await confirmDelete({
      resource: "foo",
      summaryHtml: `
        <p class="mb-2">Se eliminará permanentemente el siguiente registro:</p>
        <ul class="mb-2 ps-3">
          <li>Identificador: <strong>${escapeHtml(preview.id)}</strong></li>
          <li class="text-muted small">${escapeHtml(preview.label)}</li>
        </ul>
      `,
      extraNote: "Aclaración opcional sobre datos arrastrados.",
    });
    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const data = await deleteFoo(preview.id);
      setPreview(null);
      await notifyDeleteSuccess(data?.msg);
    } catch (e) {
      await notifyDeleteError(e, "No se pudo eliminar el registro.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      {/* ...búsqueda y preview del registro... */}
      <button
        type="button"
        className="btn btn-danger d-inline-flex align-items-center gap-2"
        onClick={handleDelete}
        disabled={deleting}
        aria-busy={deleting}
      >
        {deleting ? (
          <>
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden
              style={{ width: "1em", height: "1em", borderWidth: "0.15em" }}
            />
            <span>Eliminando…</span>
          </>
        ) : (
          <>
            <i className="bi bi-trash3" aria-hidden />
            <span>ELIMINAR</span>
          </>
        )}
      </button>
    </Layout>
  );
}
```

## Flujo recomendado para nuevos recursos

1. **Backend** (cuando aplique): exponer `DELETE /api/<recurso>/:id` con el
   middleware adecuado (`guarded`/`adminGuarded`). Validar el id, eliminar
   archivos en disco si corresponde y responder
   `{ ok: true, msg: "...", deletedId }`.
2. **Cliente API**: agregar en `SICEN-front/src/api/client.js` una función
   `deleteX(id)` que use `apiFetch(..., { method: "DELETE" })`.
3. **UI**: ofrecer al usuario la previsualización completa del registro
   antes del botón "ELIMINAR" (preferir el componente de tarjeta o tabla ya
   existente, sin acciones de edición/cambio de estado).
4. **Confirmación y feedback**: implementar el handler como en el template
   anterior. No omitir `notifyDeleteSuccess` ni `notifyDeleteError`.
5. **Limpieza local**: al confirmar, vaciar inputs/búsquedas y volver a la
   pantalla inicial del flujo de eliminación; refrescar listados paginados
   con un nonce de refetch cuando se borre desde una tabla.

## Ejemplos vivos en el repo

Usar como referencia cuando no quede claro qué datos mostrar:

- Multa vehicular: `SICEN-front/src/pages/DeleteCarFinePage.jsx`
- Multa de buque: `SICEN-front/src/pages/DeleteShipFinePage.jsx`
- Multa personal: `SICEN-front/src/pages/DeletePersonalFinePage.jsx`
- Usuario: `SICEN-front/src/pages/DeleteUserPage.jsx`
- Gente de mar: `SICEN-front/src/pages/SeafarerDeletePage.jsx`
- Unidad: `SICEN-front/src/pages/BorrarUnidadPage.jsx`
- Buque (desde listado): `SICEN-front/src/pages/AllShipsPage.jsx`
  (función `handleDeleteRow`)
- Título/licencia del catálogo: `SICEN-front/src/pages/SeafarerMetadataPage.jsx`
- Título/licencia de un marinero:
  `SICEN-front/src/components/seafarer/SeafarerConsultSections.jsx`
- Archivo de Procedimientos:
  `SICEN-front/src/components/ProcedimientosFilesList.jsx`

## Antipatrones (no hacer)

- Crear un `div className="car-fine-status-modal"` para confirmar una
  eliminación. Esa clase se reserva para los modales de cambio de estado y
  edición de multas, no para confirmaciones de borrado.
- Llamar `Swal.fire` directamente con copy distinto al del helper. Si se
  necesita un detalle adicional, agregarlo dentro de `summaryHtml` o
  `extraNote`.
- Eliminar sin confirmar (como hacía la versión anterior de
  `DeleteUserPage`). Toda eliminación debe pasar por `confirmDelete`.
- Mostrar el `alert/alert-success` de la página y omitir el Swal de éxito
  (o viceversa). El feedback final del usuario es el Swal.
- Internacionalizar a otro idioma: SICEN está en español rioplatense; usar
  "Sí, eliminar", "Cancelar", "Eliminado", "No se pudo eliminar".
