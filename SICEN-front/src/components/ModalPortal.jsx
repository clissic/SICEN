import { createPortal } from "react-dom";

/** z-index por encima del panel flotante de El Centinela (1001) y popups Leaflet (~700). */
export const SICEN_MODAL_Z_INDEX = 1055;

/**
 * Monta modales en `document.body` para que no queden atrapados
 * detrás de capas con stacking context propio (p. ej. mapa de Centinela).
 */
export function ModalPortal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}
