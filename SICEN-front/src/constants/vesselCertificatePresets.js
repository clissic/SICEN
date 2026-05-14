/**
 * Certificados estándar mostrados en la ficha del buque (filas fijas).
 * En BD cada ítem de `certificates` puede incluir `key` igual a `key` del preset
 * y campos: otorgado, convalidacion, vencimiento, puertoConvalidacion, autoridad.
 */
export const VESSEL_CERTIFICATE_PRESETS = [
  {
    key: "cargo_ship_safety_construction",
    label: "Cargo Ship Safety Construction",
  },
  {
    key: "cargo_ship_safety_equipment",
    label: "Cargo Ship Safety Equipment",
  },
  {
    key: "cargo_ship_safety_radio",
    label: "Cargo Ship Safety Radio",
  },
  {
    key: "iopp",
    label: "International Oil Pollution Prevention (IOPP)",
  },
  {
    key: "ispp",
    label: "International Sewage Pollution Prevention",
  },
  { key: "load_line", label: "Load Line" },
  {
    key: "doc_company",
    label: "Document of Compliance (Compañía)",
  },
  {
    key: "smc",
    label: "Safety Management Certificate",
  },
  { key: "iss", label: "International Ship Security" },
  {
    key: "msmd",
    label: "Minimum Safe Manning Document",
  },
  { key: "tonnage", label: "Tonnage" },
];
