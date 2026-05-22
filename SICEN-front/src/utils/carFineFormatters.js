/**
 * Utilidades de presentación reutilizadas por las páginas de multas de vehículos
 * (consulta, eliminación, edición). Mantenerlas en un módulo aparte permite que
 * la tarjeta `CarFineCard` luzca idéntica desde cualquier flujo.
 */

export const STATUS_META = {
  due: { label: "Pendiente", icon: "bi-hourglass-split", modifier: "due" },
  paid: { label: "Pagada", icon: "bi-check-circle-fill", modifier: "paid" },
  cancelled: {
    label: "Anulada",
    icon: "bi-x-circle-fill",
    modifier: "cancelled",
  },
  canceled: {
    label: "Anulada",
    icon: "bi-x-circle-fill",
    modifier: "cancelled",
  },
  anulada: {
    label: "Anulada",
    icon: "bi-x-circle-fill",
    modifier: "cancelled",
  },
  dismissed: {
    label: "Desestimada",
    icon: "bi-slash-circle-fill",
    modifier: "dismissed",
  },
  desestimada: {
    label: "Desestimada",
    icon: "bi-slash-circle-fill",
    modifier: "dismissed",
  },
  pendiente: {
    label: "Pendiente",
    icon: "bi-hourglass-split",
    modifier: "due",
  },
  pagada: { label: "Pagada", icon: "bi-check-circle-fill", modifier: "paid" },
};

export function statusMeta(status) {
  if (!status) {
    return { label: "Sin estado", icon: "bi-dash-circle", modifier: "" };
  }
  const key = String(status).trim().toLowerCase();
  return (
    STATUS_META[key] || {
      label: status,
      icon: "bi-info-circle",
      modifier: "",
    }
  );
}

export function formatPlate(plate) {
  if (!plate) return "";
  return String(plate).toUpperCase().trim();
}

export function formatVehicle(brand, model) {
  const parts = [brand, model]
    .map((s) => (s == null ? "" : String(s).trim()))
    .filter(Boolean);
  return parts.join(" ");
}

export function formatAmount(n) {
  if (n == null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString("es-UY", { maximumFractionDigits: 2 });
}

export function provesAsArray(fp) {
  if (Array.isArray(fp)) return fp.filter(Boolean);
  if (fp) return [fp];
  return [];
}
