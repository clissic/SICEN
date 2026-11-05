export const PATROL_STATUS_OPTIONS = [
  { id: "planned", label: "Planificada", btnClass: "btn-warning" },
  { id: "fulfilled", label: "Cumplida", btnClass: "btn-success" },
  { id: "missed", label: "Incumplida", btnClass: "btn-danger" },
];

export const PATROL_AREA_OPTIONS = [
  { id: "rio-uruguay", label: "Río Uruguay" },
  { id: "rio-de-la-plata", label: "Río de la Plata" },
  { id: "oceano-atlantico", label: "Océano Atlántico" },
];

export const PATROL_FUEL_OPTIONS = [
  { id: "nafta-super", label: "Nafta Super 95", shortLabel: "Super 95" },
  { id: "nafta-premium", label: "Nafta Premium 97", shortLabel: "Premium 97" },
  { id: "gasoil-comun", label: "Gas Oil 50S", shortLabel: "50S" },
  { id: "gasoil-especial", label: "Gas Oil 10S", shortLabel: "10S" },
  { id: "jet-a1", label: "Jet A-1", shortLabel: "Jet A-1" },
];

/** Los 4 tipos de la grilla 2×2 en estadísticas (sin Jet A-1). */
export const PATROL_FUEL_GRID_OPTIONS = PATROL_FUEL_OPTIONS.filter(
  (opt) => opt.id !== "jet-a1"
);

/** Colores de barra / puntito por combustible (ids estables en BD). */
export const PATROL_FUEL_BAR_COLORS = {
  "nafta-super": "#e6c200", // amarillo
  "nafta-premium": "#c62828", // rojo
  "gasoil-comun": "#6c757d", // gris
  "gasoil-especial": "#1565c0", // azul
  "jet-a1": "#4a5d73",
};

export function emptyFulfillmentForm() {
  return {
    vehicle: "",
    registeredCraft: 0,
    controlledSports: 0,
    controlledMerchant: 0,
    controlledFishing: 0,
    identifiedPersons: 0,
    fuelType: "",
    fuelLiters: 0,
    incidents: [],
    distanceNm: 0,
    distanceKm: 0,
    breakdowns: 0,
    personnel: 1,
  };
}

export function fulfillmentFromPatrol(patrol) {
  const f = patrol?.fulfillment || {};
  const incidents = Array.isArray(f.incidents)
    ? f.incidents.map((item) => ({
        detail: String(item?.detail || ""),
      }))
    : [];
  return {
    vehicle: f.vehicle || "",
    registeredCraft: Number(f.registeredCraft) || 0,
    controlledSports: Number(f.controlledCraft?.sports) || 0,
    controlledMerchant: Number(f.controlledCraft?.merchant) || 0,
    controlledFishing: Number(f.controlledCraft?.fishing) || 0,
    identifiedPersons: Number(f.identifiedPersons) || 0,
    fuelType: f.fuel?.type || "",
    fuelLiters: Number(f.fuel?.liters) || 0,
    incidents,
    distanceNm: Number(f.distanceNm) || 0,
    distanceKm: Number(f.distanceKm) || 0,
    breakdowns: Number(f.breakdowns) || 0,
    personnel: Math.max(1, Number(f.personnel) || 1),
  };
}

export function buildFulfillmentPayload(form) {
  const incidents = (Array.isArray(form.incidents) ? form.incidents : [])
    .map((item) => ({ detail: String(item?.detail || "").trim() }))
    .filter((item) => item.detail);
  return {
    vehicle: String(form.vehicle || "").trim(),
    registeredCraft: Number(form.registeredCraft) || 0,
    controlledCraft: {
      sports: Number(form.controlledSports) || 0,
      merchant: Number(form.controlledMerchant) || 0,
      fishing: Number(form.controlledFishing) || 0,
    },
    identifiedPersons: Number(form.identifiedPersons) || 0,
    fuel: {
      type: String(form.fuelType || "").trim(),
      liters: Number(form.fuelLiters) || 0,
    },
    incidents,
    incidentCount: incidents.length,
    distanceNm: Number(form.distanceNm) || 0,
    distanceKm: Number(form.distanceKm) || 0,
    breakdowns: Number(form.breakdowns) || 0,
    personnel: Number(form.personnel) || 1,
  };
}

export function validateFulfillmentForm(form) {
  if (!String(form.vehicle || "").trim()) return "Indicá el medio utilizado (matrícula).";
  if (!form.fuelType) return "Elegí el tipo de combustible.";
  if (Number(form.personnel) < 1) return "El personal involucrado debe ser al menos 1.";
  return "";
}

export function statusLabel(status) {
  return (
    PATROL_STATUS_OPTIONS.find((opt) => opt.id === status)?.label || "Estado"
  );
}

export function areaLabel(id) {
  return PATROL_AREA_OPTIONS.find((opt) => opt.id === id)?.label || id || "—";
}

export function fuelLabel(id) {
  return PATROL_FUEL_OPTIONS.find((opt) => opt.id === id)?.label || id || "—";
}
