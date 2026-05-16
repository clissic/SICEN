/** Lleva el documento al inicio tras actualizar el DOM (p. ej. mensajes del formulario). */
export function scrollPageToTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

/** Desplaza la vista hasta un elemento por `id` (p. ej. sección Títulos / Licencias). */
export function scrollElementIntoViewById(id) {
  if (typeof document === "undefined" || !id) return;
  setTimeout(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, 0);
}
