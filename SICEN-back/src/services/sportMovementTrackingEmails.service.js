import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";
import { transport } from "../utils/nodemailer.js";
import {
  mergeSicenEmailAttachments,
  sicenButtonPrimaryHtml,
  sicenEmailLayout,
  sportMovementNoSignal5EmailHtml,
} from "../utils/emailTemplates.js";
import {
  collectUnitContactEmails,
  findUnitByAcronym,
} from "./units.service.js";
import { formatCoordDms, formatCoordPairLabel } from "../utils/geoDms.js";

function str(v) {
  return String(v ?? "").trim();
}

function movementUnitAcronyms(movement) {
  const origin = str(movement?.originUnit).toUpperCase();
  const dest = str(movement?.destinationUnit).toUpperCase();
  const transit = Array.isArray(movement?.informedUnits)
    ? movement.informedUnits.map((u) => str(u).toUpperCase()).filter(Boolean)
    : [];
  return [...new Set([origin, dest, ...transit].filter(Boolean))];
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function formatCoordinates(lat, lng) {
  return formatCoordPairLabel(lat, lng);
}

/**
 * Envía correo a los contactos de origen, destino y tránsito cuando
 * un movimiento lleva más de 5 minutos sin posiciones GPS.
 * Se invoca en cada bucket de 5 minutos (cada episodio de silencio).
 */
export async function sendSportMovementNoSignal5Emails(movement, { bucket = 1 } = {}) {
  if (!movement?._id) return;

  const unitAcronyms = movementUnitAcronyms(movement);
  if (!unitAcronyms.length) return;

  const silentMinutes = Math.max(5, Number(bucket) * 5 || 5);
  const vesselName = str(movement.vesselSnapshot?.name) || "buque deportivo";
  const vesselReg = str(movement.vesselSnapshot?.nationalRegistryNumber) || "—";
  const skipperName = str(movement.skipper?.fullName) || "—";
  const lastPos = movement.tracking?.lastPosition || {};
  const centinelaHref = `${env.publicAppUrl}/centinela`;
  const bodyHtml =
    sportMovementNoSignal5EmailHtml({
      vesselName,
      vesselReg,
      skipperName,
      originUnit: str(movement.originUnit).toUpperCase(),
      destinationUnit: str(movement.destinationUnit).toUpperCase(),
      departurePort: str(movement.departurePort),
      destinationPort: str(movement.destinationPort),
      etaFormatted: formatDateTime(movement.eta),
      lastPositionAt: formatDateTime(
        lastPos.receivedAt || lastPos.positionTimestamp
      ),
      lastPositionLatDms: formatCoordDms(lastPos.latitude, "lat"),
      lastPositionLngDms: formatCoordDms(lastPos.longitude, "lng"),
      coordinatesLabel: formatCoordinates(lastPos.latitude, lastPos.longitude),
      silentMinutes,
    }) + sicenButtonPrimaryHtml(centinelaHref, "Abrir El Centinela");

  const html = sicenEmailLayout({
    title: `Sin señal GPS (${silentMinutes} min)`,
    introLine:
      "SICEN detectó que un buque en tránsito dejó de enviar posiciones GPS.",
    bodyHtml,
    footerNote:
      "Mensaje automático de SICEN · Movimientos deportivos entre prefecturas.",
  });

  const subject = `[SICEN] Sin señal GPS (${silentMinutes} min) — ${vesselName}`;

  for (const acronym of unitAcronyms) {
    const unit = await findUnitByAcronym(acronym);
    const recipients = collectUnitContactEmails(unit);
    if (!recipients.length) {
      logger.info(
        `sportMovement no_signal_5 email: sin contactos para unidad ${acronym}`
      );
      continue;
    }
    try {
      await transport.sendMail({
        from: env.googleEmail,
        to: recipients.join(", "),
        subject,
        html,
        attachments: mergeSicenEmailAttachments(),
      });
    } catch (error) {
      logger.error(
        `sportMovement no_signal_5 email failed (${acronym}): ${error?.message || error}`
      );
    }
  }
}
