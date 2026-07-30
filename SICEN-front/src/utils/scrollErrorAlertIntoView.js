/**
 * Desplaza la vista hasta un alert de error (p. ej. `.alert-danger`)
 * para que el usuario lo vea aunque esté fuera del viewport o del
 * contenedor con overflow (modal-body, etc.).
 */
export function scrollErrorAlertIntoView(el) {
  if (!el || typeof el.scrollIntoView !== "function") return;
  requestAnimationFrame(() => {
    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  });
}
