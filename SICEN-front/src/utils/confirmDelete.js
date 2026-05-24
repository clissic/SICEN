import Swal from "sweetalert2";

/** Escapa HTML para incrustar texto plano en una alerta de SweetAlert2. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Muestra un cuadro de confirmación uniforme para acciones de eliminación.
 *
 * @param {object} options
 * @param {string} options.resource Nombre del recurso a eliminar (ej.: "multa", "usuario").
 *   Aparece como "¿Eliminar {resource}?" en el título.
 * @param {string} [options.title] Título personalizado. Sobrescribe `resource`.
 * @param {string} [options.summaryHtml] Bloque HTML con el resumen del registro
 *   (se renderiza con `text-start`). Si se provee, sustituye el texto plano.
 * @param {string} [options.summaryText] Texto plano alternativo al HTML.
 * @param {string} [options.extraNote] Aclaración adicional (ej.: archivos asociados).
 * @returns {Promise<import("sweetalert2").SweetAlertResult>}
 */
export function confirmDelete({
  resource,
  title,
  summaryHtml,
  summaryText,
  extraNote,
} = {}) {
  const computedTitle = title || `¿Eliminar ${resource ?? "registro"}?`;
  const body = summaryHtml
    ? summaryHtml
    : `<p class="mb-2">${escapeHtml(summaryText ?? "Se eliminará el registro seleccionado.")}</p>`;
  const note = extraNote
    ? `<p class="mt-2 mb-1 small text-muted">${escapeHtml(extraNote)}</p>`
    : "";
  const warning = `<p class="mb-0 small text-danger fw-semibold">Esta acción no se puede deshacer.</p>`;

  return Swal.fire({
    title: computedTitle,
    html: `<div class="text-start">${body}${note}${warning}</div>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc3545",
    focusCancel: true,
    reverseButtons: true,
  });
}

/** Notificación uniforme de eliminación exitosa. */
export function notifyDeleteSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: "Eliminado",
    text: message || "El registro se eliminó correctamente.",
    confirmButtonText: "Aceptar",
  });
}

/** Notificación uniforme de error al eliminar. */
export function notifyDeleteError(error, fallback) {
  const msg =
    error?.message ||
    error?.data?.msg ||
    fallback ||
    "Ocurrió un error al eliminar el registro.";
  return Swal.fire({
    icon: "error",
    title: "No se pudo eliminar",
    text: msg,
    confirmButtonText: "Aceptar",
  });
}
