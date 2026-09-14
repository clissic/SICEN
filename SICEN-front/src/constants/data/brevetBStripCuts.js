/**
 * Cortes de círculos para la franja de brevet Categoría B.
 * Índices 0-based sobre BREVET_B_COAST_POINTS (registro = índice + 1).
 *
 * Extremo E (Chuy): el arco se conserva de `to`→`from` (horario). `to` ≈ 127°
 * alinea el borde SE con el límite marítimo UY–Brasil (MarineRegions 12/24 MN).
 *
 * Checkpoint activo documentado: v1 (1–12 @ 270→090; 212–219 @ 315→135).
 * Restaurar: node scripts/restore-brevet-b-checkpoint.mjs v1
 */
export const BREVET_B_STRIP_CUTS = [
  {
    /* Registros 1–12 → índices 0–11 */
    indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    from: 270,
    to: 90,
  },
  {
    /* Registros 212–219 → índices 211–218; extremo Chuy alineado a límite UY–BR */
    indices: [211, 212, 213, 214, 215, 216, 217, 218],
    from: 315,
    to: 127,
  },
];
