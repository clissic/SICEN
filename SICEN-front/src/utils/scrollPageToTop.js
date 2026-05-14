/** Lleva el documento al inicio tras actualizar el DOM (p. ej. mensajes del formulario). */
export function scrollPageToTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}
