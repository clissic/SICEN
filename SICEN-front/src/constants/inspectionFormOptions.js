/**
 * Opciones fijas para el formulario de alta/edición de inspecciones
 * (Estado Rector de Puertos).
 */

/**
 * Puertos uruguayos donde puede registrar el ingreso un buque de Ultramar.
 *
 * Los valores se almacenan tal cual en `arrivalPort` (mayúsculas) y son los
 * únicos válidos en el desplegable de "Puerto de ingreso". Si en el futuro
 * hace falta sumar un puerto, agregarlo a esta lista para que las
 * estadísticas que agrupan por puerto sigan trabajando con un set acotado.
 */
export const URUGUAY_ARRIVAL_PORTS = [
  "MONTEVIDEO",
  "NUEVA PALMIRA",
  "COLONIA",
  "FRAY BENTOS",
  "PAYSANDU",
  "SALTO",
  "MALDONADO",
  "LA PALOMA",
];

/**
 * Opciones aceptadas para la prioridad CIALA.
 *
 * El backend normaliza el texto a 1 o 2 (`normalizeCialaPriority` en
 * `vesselInspections.service.js`). Cualquier otro valor queda como
 * "Sin prioridad" en las estadísticas. Mantenemos el set fijo en el front
 * para que el usuario no escriba variantes con errores ("Pioridad 1", etc.).
 */
export const CIALA_PRIORITY_OPTIONS = [
  { value: "", label: "Sin prioridad" },
  { value: "Prioridad 1", label: "Prioridad 1" },
  { value: "Prioridad 2", label: "Prioridad 2" },
];
