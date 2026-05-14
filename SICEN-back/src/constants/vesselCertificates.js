import { VESSEL_CERTIFICATE_OTHER_KEYS } from "./vesselCertificateOtherKeys.js";

/** Claves de certificado admitidas (presets fijos + certificados adicionales). */
export const VESSEL_CERTIFICATE_KEYS = new Set([
  "cargo_ship_safety_construction",
  "cargo_ship_safety_equipment",
  "cargo_ship_safety_radio",
  "iopp",
  "ispp",
  "load_line",
  "doc_company",
  "smc",
  "iss",
  "msmd",
  "tonnage",
  ...VESSEL_CERTIFICATE_OTHER_KEYS,
]);

const MAX_FIELD_LEN = 2000;

export function normalizeCertificatePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  const clip = (v) => {
    const t = v == null ? "" : String(v).trim();
    if (t.length > MAX_FIELD_LEN) return t.slice(0, MAX_FIELD_LEN);
    return t;
  };
  const kindRaw = clip(b.autoridadKind);
  const autoridadKind =
    kindRaw === "recognized" || kindRaw === "flag" ? kindRaw : "";
  return {
    key: clip(b.key),
    otorgado: clip(b.otorgado),
    convalidacion: clip(b.convalidacion ?? b.convalidación),
    vencimiento: clip(b.vencimiento),
    puertoConvalidacion: clip(
      b.puertoConvalidacion ?? b.puertoConvalidación
    ).toUpperCase(),
    autoridadKind,
    autoridadSociety:
      autoridadKind === "recognized" ? clip(b.autoridadSociety) : "",
    autoridadFlagCountry:
      autoridadKind === "flag" ? clip(b.autoridadFlagCountry) : "",
    autoridad: clip(b.autoridad),
  };
}

/** Texto resumido de autoridad para listados (opcional). */
export function buildAutoridadSummary(n) {
  if (n.autoridadKind === "recognized" && n.autoridadSociety) {
    return n.autoridadSociety;
  }
  if (n.autoridadKind === "flag" && n.autoridadFlagCountry) {
    return `${n.autoridadFlagCountry} (bandera)`;
  }
  return n.autoridad || "";
}
