/** Parseo de GT tolerando coma decimal. */
export function parseGrossTonnageInput(s) {
  const raw = String(s ?? "").trim().replace(",", ".");
  if (raw === "") return NaN;
  return Number(raw);
}

export function deportivoGrossTonnageCoherent(gt, recreationalDocType) {
  if (!Number.isFinite(gt)) return false;
  const d = recreationalDocType;
  if (d === "Certificado de Construcción") return gt >= 0 && gt <= 0.6;
  if (d === "Registro de Embarcaciones Deportivas")
    return gt >= 0.601 && gt <= 6;
  if (d === "Matrícula de Cabotaje") return gt > 6;
  return false;
}

/** Validación previa al envío (coherencia OMI / matrícula / deportivo). */
export function getShipRegistrationClientErr(form) {
  const vesselType = form.vesselType;
  const isUltramar = vesselType === "Ultramar";
  const isCabotaje = vesselType === "Cabotaje";
  const isDeportivo = vesselType === "Deportivo";
  if (!vesselType) return "";
  if (isUltramar && !String(form.imoNumber ?? "").trim()) {
    return "El número OMI es obligatorio para buques de ultramar.";
  }
  if ((isCabotaje || isDeportivo) && !String(form.nationalRegistryNumber ?? "").trim()) {
    if (isCabotaje) {
      return "La matrícula nacional es obligatoria para buques de cabotaje.";
    }
    return "La matrícula es obligatoria para buques deportivos.";
  }
  if (isDeportivo && !form.recreationalDocType) {
    return "Seleccione el tipo de documentación del buque deportivo.";
  }
  return "";
}
