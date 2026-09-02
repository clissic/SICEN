import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";
import { transport } from "../utils/nodemailer.js";
import {
  mergeSicenEmailAttachments,
  sicenEmailLayout,
  sportMovementArrivalReportEmailHtml,
} from "../utils/emailTemplates.js";
import {
  collectMarinaMercanteEmails,
  findUnitByAcronym,
} from "./units.service.js";
import { SportMovementMongoose } from "../DAO/models/mongoose/sportMovements.mongoose.js";

function str(v) {
  return String(v ?? "").trim();
}

function formatEta(eta) {
  if (!eta) return "—";
  const d = eta instanceof Date ? eta : new Date(eta);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Envía correo a Marina Mercante de destino y tránsito cuando un náuta informa arribo.
 * Idempotente vía movement.tracking.arrivalEmailsSentAt.
 */
export async function sendSportMovementArrivalEmails(movement) {
  if (!movement?._id) return;

  if (movement.tracking?.arrivalEmailsSentAt) {
    return;
  }

  const destinationUnit = str(movement?.destinationUnit).toUpperCase();
  const transit = Array.isArray(movement?.informedUnits)
    ? movement.informedUnits.map((u) => str(u).toUpperCase()).filter(Boolean)
    : [];

  const unitAcronyms = [...new Set([destinationUnit, ...transit].filter(Boolean))];
  if (!unitAcronyms.length) return;

  const originUnit = str(movement?.originUnit).toUpperCase();
  const vesselName = str(movement?.vesselSnapshot?.name) || "—";
  const vesselReg =
    str(movement?.vesselSnapshot?.nationalRegistryNumber) || "—";
  const skipperName = str(movement?.skipper?.fullName) || "—";
  const bodyHtml = sportMovementArrivalReportEmailHtml({
    vesselName,
    vesselReg,
    skipperName,
    originUnit,
    destinationUnit,
    departurePort: str(movement?.departurePort),
    destinationPort: str(movement?.destinationPort),
    etaFormatted: formatEta(movement?.eta),
    observations: str(movement?.closureNotes),
    trackingNote:
      "El seguimiento GPS del movimiento fue finalizado al informar el arribo.",
  });

  const html = sicenEmailLayout({
    title: "Arribo informado por náuta",
    introLine:
      "Un náuta deportivo informó el arribo de su embarcación en SICEN.",
    bodyHtml,
    footerNote:
      "Mensaje automático de SICEN · Movimientos deportivos entre prefecturas.",
  });

  const subject = `[SICEN] Arribo informado — ${vesselName} → ${destinationUnit}`;
  let sentAny = false;

  for (const acronym of unitAcronyms) {
    const unit = await findUnitByAcronym(acronym);
    const recipients = collectMarinaMercanteEmails(unit);
    if (!recipients.length) {
      logger.info(
        `sportMovement arrival email: sin emailMarinaMercante para unidad ${acronym}`
      );
      continue;
    }
    const isDestination = acronym === destinationUnit;
    try {
      await transport.sendMail({
        from: env.googleEmail,
        to: recipients.join(", "),
        subject: isDestination
          ? subject
          : `[SICEN] Arribo informado (tránsito) — ${vesselName}`,
        html,
        attachments: mergeSicenEmailAttachments(),
      });
      sentAny = true;
    } catch (error) {
      logger.error(
        `sportMovement arrival email failed (${acronym}): ${error?.message || error}`
      );
    }
  }

  if (sentAny || unitAcronyms.length) {
    await SportMovementMongoose.updateOne(
      { _id: movement._id },
      { $set: { "tracking.arrivalEmailsSentAt": new Date() } }
    );
  }
}
