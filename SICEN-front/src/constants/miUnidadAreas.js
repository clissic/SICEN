export const MI_UNIDAD_AREAS = [
  {
    slug: "centro-control",
    title: "CENTRO DE CONTROL",
    subtitle: "Centro de Control e Información del Movimiento Marítimo.",
    iconClass: "bi-broadcast",
  },
  {
    slug: "secretaria",
    title: "SECRETARÍA",
    subtitle: "Notas, órdenes internas, cartas de servicio, expedientes, etc.",
    iconClass: "bi-journal-text",
  },
  {
    slug: "puerto-capurro",
    title: "PUERTO CAPURRO",
    subtitle: "Información relacionada con la pesca nacional.",
    iconClass: "bi-geo-alt",
  },
  {
    slug: "depto-control-pesquero",
    title: "DEPTO. CONTROL PESQUERO",
    subtitle: "Buques de interés y herramientas de analisis de datos.",
    iconClass: "bi-bar-chart",
  },
];

export function getMiUnidadArea(slug) {
  return MI_UNIDAD_AREAS.find((a) => a.slug === slug) ?? null;
}

