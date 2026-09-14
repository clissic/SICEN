/**
 * Capas IUU LAC (FIU) en El Centinela — FeatureServers públicos del
 * LAC IUU Fishing Dashboard (datos Windward vía FIU SRH).
 * Uso no comercial / analítico; sin API key Windward.
 */

export const FIU_IUU_LAYER_ITEMS = [
  {
    id: "fishing",
    name: "Actividad de pesca",
    color: "#2980b9",
    infoText:
      "Eventos de pesca inferida con buques de alto riesgo IUU (Windward vía FIU).",
  },
  {
    id: "dark",
    name: "Dark (sin AIS)",
    color: "#c0392b",
    infoText:
      "Periodos sin emisión AIS detectados en buques de alto riesgo IUU (LatAm).",
  },
  {
    id: "sts",
    name: "STS (ship-to-ship)",
    color: "#8e44ad",
    infoText:
      "Encuentros ship-to-ship con al menos un buque de alto riesgo IUU (LatAm).",
  },
];

export const FIU_IUU_LAYER_IDS = FIU_IUU_LAYER_ITEMS.map((l) => l.id);

export const FIU_IUU_LAYER_COLORS = Object.fromEntries(
  FIU_IUU_LAYER_ITEMS.map((l) => [l.id, l.color])
);

export const FIU_IUU_LAYER_LABELS = Object.fromEntries(
  FIU_IUU_LAYER_ITEMS.map((l) => [l.id, l.name])
);

export const FIU_IUU_DASHBOARD_URL =
  "https://srh-fiu.maps.arcgis.com/apps/dashboards/3b76ad02a3444c928f347cd6ddc1846e";

export const FIU_IUU_METHODOLOGY_URL =
  "https://srh.fiu.edu/uploads/lac-iuu-fishing-dashboard-methodology.pdf";

export const FIU_IUU_SRH_URL =
  "https://srh.fiu.edu/lac-illegal-unreported-and-unregulated-iuu-fishing-dashboard/";

/** Disclaimer rioplatense para popover / detalle. */
export const FIU_IUU_DISCLAIMER =
  "Datos públicos del LAC IUU Fishing Dashboard (FIU SRH), fuente Windward. Solo uso no comercial / analítico; no sustituye inteligencia operativa propia. Ver metodología FIU.";
