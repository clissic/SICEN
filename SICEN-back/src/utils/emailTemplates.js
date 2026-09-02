/**
 * Plantillas HTML para correos transaccionales (inline CSS, tablas para compatibilidad).
 * Espaciado: una sola columna de contenido con ritmo vertical uniforme; tablas anidadas solo donde ayudan en Gmail/Outlook.
 */

import env from "../config/env.config.js";
import {
  getSicenEmailLogoAttachment,
  mergeSicenEmailAttachments,
  SICEN_EMAIL_LOGO_CID,
} from "./emailLogo.js";

export { mergeSicenEmailAttachments };

/** Ruta bajo `public/` — fallback si no hay adjunto CID embebido. */
const EMAIL_HEADER_LOGO_PATH = "/img/Logo-PNN-Blanco.png";

function emailHeaderLogoAbsoluteUrl() {
  const base = String(env.emailAssetsBaseUrl || "").replace(/\/+$/, "");
  return `${base}${EMAIL_HEADER_LOGO_PATH}`;
}

export function escapeHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Comillas simples en nombres con espacio: si usáramos "Segoe UI" dentro de style="...", cerraría el atributo HTML y rompería el CSS. */
const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** Gutter horizontal tarjeta (~32–36 chars por línea en 600px). */
const PAD_X = "28px";
const HEADER_PAD = `22px ${PAD_X}`;
const MAIN_PAD = `28px ${PAD_X} 32px`;
const FOOTER_PAD = `18px ${PAD_X} 22px`;

/** Margen lateral extra para párrafos y texto corrido (dentro del bloque principal). */
const P_SIDE = "14px";

/**
 * Estilos de cuerpo unificados con el correo «Bienvenido al Sistema Centinela»
 * (hereda `font-size:15px` del bloque principal; estos strings completan color/márgenes).
 */
export const sicenEmailBodyStyles = {
  paragraph: "margin:0 0 14px;line-height:1.65;color:#212529;",
  paragraphAfterBlock: "margin:16px 0 14px;line-height:1.65;color:#212529;",
  leadStrong: "margin:0 0 16px;font-size:16px;line-height:1.5;color:#212529;",
  labelUppercase: "margin:0 0 6px;font-size:13px;color:#495057;text-transform:uppercase;letter-spacing:0.06em;line-height:1.5;",
  sectionHeading: "margin:0 0 8px;font-weight:600;color:#212529;line-height:1.5;",
  metaLine: "margin:0 0 18px;font-size:13px;line-height:1.5;color:#495057;",
  sectionHeadingSpaced: "margin:0 0 12px;font-weight:600;color:#212529;line-height:1.5;",
  link: "color:#0d6efd;text-decoration:none;",
  table: "border-collapse:collapse;font-size:14px;margin:0 0 18px;width:100%;color:#212529;",
  trBorder: "border-bottom:1px solid #dee2e6;",
  tdLabel: "padding:10px 0;color:#495057;width:38%;font-size:14px;line-height:1.5;vertical-align:top;",
  tdValue: "padding:10px 0;color:#212529;font-size:14px;line-height:1.5;vertical-align:top;",
  calloutInfoTitle: "margin:0 0 10px;font-weight:600;color:#084298;line-height:1.5;",
  calloutLine: "margin:0 0 8px;color:#212529;line-height:1.55;",
  calloutLineLast: "margin:0;color:#212529;line-height:1.55;",
  codeInline:
    "background:#ffffff;padding:3px 8px;border-radius:4px;font-size:14px;border:1px solid #b6d4fe;",
  justification: "margin:0;white-space:pre-wrap;line-height:1.6;color:#212529;",
  tokenLabel:
    "margin:0 0 8px;font-size:12px;color:#495057;text-transform:uppercase;letter-spacing:0.05em;line-height:1.5;",
  tokenCode:
    "margin:0;font-size:22px;font-weight:700;letter-spacing:0.12em;font-family:Consolas,Monaco,monospace;color:#212529;line-height:1.3;",
  tokenHint: "margin:12px 0 0;font-size:13px;color:#495057;line-height:1.5;",
  recoveryUrl: "margin:12px 0 16px;font-size:13px;color:#495057;line-height:1.5;word-break:break-all;",
  recoveryDisclaimer: "margin:0;font-size:13px;color:#495057;line-height:1.5;",
};

function headerLogoImgHtml() {
  const logoAtt = getSicenEmailLogoAttachment();
  const src = logoAtt
    ? `cid:${SICEN_EMAIL_LOGO_CID}`
    : escapeHtml(emailHeaderLogoAbsoluteUrl());
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0 0 14px;">
      <img src="${src}" alt="Prefectura Nacional Naval" width="72" height="72" border="0" style="display:block;width:72px;height:72px;max-width:72px;margin:0 auto;border:0;line-height:0;font-size:0;">
    </td>
  </tr>
</table>`;
}

/**
 * Celda con padding en tabla anidada (mejor soporte que padding solo en el td de la fila exterior).
 */
function paddedCell(innerTdStyle, innerHtml) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td style="${innerTdStyle}">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

/** Contenedor principal: ancho fijo ~600px, cabecera marca, pie discreto. */
export function sicenEmailLayout({ title, introLine, bodyHtml, footerNote }) {
  const safeTitle = escapeHtml(title);
  const safeIntro = introLine ? escapeHtml(introLine) : "";
  const foot =
    footerNote ||
    "Este mensaje fue generado automáticamente por SICEN. Por favor no responda a este correo.";

  const titleBlock = `<div style="font-size:18px;font-weight:600;color:#212529;line-height:1.35;margin:0 ${P_SIDE} ${safeIntro ? "12px" : "20px"};">${safeTitle}</div>`;
  const introBlock = safeIntro
    ? `<p style="margin:0 ${P_SIDE} 24px;font-size:14px;color:#495057;line-height:1.55;">${safeIntro}</p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#e9ecef;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#e9ecef;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dee2e6;border-collapse:collapse;">
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,#1e3a5f 0%,#0d6efd 100%);">
              ${paddedCell(
                `padding:${HEADER_PAD};color:#ffffff;font-family:${FONT_STACK};`,
                `${headerLogoImgHtml()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
  <tr>
    <td align="center" style="font-size:20px;font-weight:700;letter-spacing:0.04em;line-height:1.25;color:#ffffff;padding:0;font-family:${FONT_STACK};">SISTEMA CENTINELA</td>
  </tr>
  <tr>
    <td align="center" style="font-size:12px;line-height:1.45;color:#e7f1ff;padding:10px 0 0;font-family:${FONT_STACK};">Prefectura Nacional Naval</td>
  </tr>
</table>`
              )}
            </td>
          </tr>
          <tr>
            <td style="padding:0;background-color:#ffffff;">
              ${paddedCell(
                `padding:${MAIN_PAD};font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:#212529;`,
                `${titleBlock}${introBlock}<div style="margin-left:${P_SIDE};margin-right:${P_SIDE};">${bodyHtml}</div>`
              )}
            </td>
          </tr>
          <tr>
            <td style="padding:0;background-color:#f1f3f5;border-top:1px solid #dee2e6;">
              ${paddedCell(
                `padding:${FOOTER_PAD};font-family:${FONT_STACK};font-size:12px;line-height:1.5;color:#495057;`,
                `<p style="margin:0 ${P_SIDE};">${escapeHtml(foot)}</p>`
              )}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Caja destacada (credenciales, aviso). Una sola celda con padding — sin doble anidación. */
export function sicenCalloutHtml(innerHtml, variant = "info") {
  const bg =
    variant === "warning"
      ? "#fff8e6"
      : variant === "muted"
        ? "#f1f3f5"
        : "#e8f2ff";
  const border =
    variant === "warning"
      ? "#e0a800"
      : variant === "muted"
        ? "#ced4da"
        : "#0b5ed7";
  const text =
    variant === "warning"
      ? "#5c4300"
      : "#212529";
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:20px 0;border-collapse:collapse;border-radius:8px;background-color:${bg};border-left:4px solid ${border};">
  <tr>
    <td style="padding:18px 20px;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${text};">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

/** Botón primario estilo “btn-primary” (bgcolor + inline para Gmail/Outlook). */
export function sicenButtonPrimaryHtml(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto 8px;border-collapse:separate;">
  <tr>
    <td align="center" bgcolor="#0d6efd" style="border-radius:8px;background-color:#0d6efd;">
      <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1.25;color:#ffffff !important;text-decoration:none !important;border-radius:8px;mso-line-height-rule:exactly;">${safeLabel}</a>
    </td>
  </tr>
</table>`;
}

/** Botón de peligro (p. ej. rechazar solicitud). */
export function sicenButtonDangerHtml(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto 8px;border-collapse:separate;">
  <tr>
    <td align="center" bgcolor="#dc3545" style="border-radius:8px;background-color:#dc3545;">
      <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1.25;color:#ffffff !important;text-decoration:none !important;border-radius:8px;mso-line-height-rule:exactly;">${safeLabel}</a>
    </td>
  </tr>
</table>`;
}

/** Dos botones apilados (crear / rechazar) centrados. */
export function sicenButtonStackHtml(buttonsHtml) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto 8px;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0;">
      ${buttonsHtml}
    </td>
  </tr>
</table>`;
}

/** Cuerpo HTML para aviso de arribo informado por náuta a prefecturas involucradas. */
export function sportMovementArrivalReportEmailHtml({
  vesselName,
  vesselReg,
  skipperName,
  originUnit,
  destinationUnit,
  departurePort,
  destinationPort,
  etaFormatted,
  observations,
  trackingNote = "",
}) {
  const S = sicenEmailBodyStyles;
  const obsBlock = observations
    ? `<p style="${S.sectionHeading}">Observaciones del náuta</p>
${sicenCalloutHtml(`<p style="${S.justification}">${escapeHtml(observations)}</p>`, "muted")}`
    : "";
  const trackingBlock = trackingNote
    ? `<p style="${S.metaLine}"><em>${escapeHtml(trackingNote)}</em></p>`
    : "";
  return `
<p style="${S.paragraph}">El patrón <strong>${escapeHtml(skipperName || "—")}</strong> informó el arribo del buque deportivo a través de SICEN.</p>
<p style="${S.paragraph}"><strong>Buque:</strong> ${escapeHtml(vesselName || "—")} · <strong>Matrícula:</strong> ${escapeHtml(vesselReg || "—")}</p>
<p style="${S.metaLine}"><strong>Prefectura de despacho:</strong> ${escapeHtml(originUnit || "—")}</p>
<p style="${S.metaLine}"><strong>Prefectura de destino:</strong> ${escapeHtml(destinationUnit || "—")}</p>
<p style="${S.metaLine}"><strong>Puerto despacho:</strong> ${escapeHtml(departurePort || "—")}</p>
<p style="${S.metaLine}"><strong>Puerto destino:</strong> ${escapeHtml(destinationPort || "—")}</p>
<p style="${S.metaLine}"><strong>ETA registrada:</strong> ${escapeHtml(etaFormatted || "—")}</p>
${obsBlock}
${trackingBlock}
<p style="${S.paragraph}">El movimiento quedó cerrado como <strong>Arribado</strong> en el sistema.</p>
`;
}

/** Cuerpo HTML para alerta de sin señal GPS (5 minutos). */
export function sportMovementNoSignal5EmailHtml({
  vesselName,
  vesselReg,
  skipperName,
  originUnit,
  destinationUnit,
  departurePort,
  destinationPort,
  etaFormatted,
  lastPositionAt,
  lastPositionLatDms = "",
  lastPositionLngDms = "",
  coordinatesLabel = "",
  silentMinutes = 5,
}) {
  const S = sicenEmailBodyStyles;
  const latDms = lastPositionLatDms || "—";
  const lngDms = lastPositionLngDms || "—";
  const coordsBlock =
    lastPositionLatDms || lastPositionLngDms || coordinatesLabel
      ? `<p style="${S.metaLine}"><strong>Última posición conocida:</strong><br>
Lat. ${escapeHtml(latDms)}<br>
Long. ${escapeHtml(lngDms)}</p>`
      : "";
  return `
<p style="${S.paragraph}">El buque deportivo <strong>${escapeHtml(vesselName || "—")}</strong> dejó de enviar posiciones GPS durante más de <strong>${silentMinutes} minutos</strong>.</p>
<p style="${S.paragraph}"><strong>Matrícula:</strong> ${escapeHtml(vesselReg || "—")} · <strong>Patrón:</strong> ${escapeHtml(skipperName || "—")}</p>
<p style="${S.metaLine}"><strong>Prefectura de despacho:</strong> ${escapeHtml(originUnit || "—")}</p>
<p style="${S.metaLine}"><strong>Prefectura de destino:</strong> ${escapeHtml(destinationUnit || "—")}</p>
<p style="${S.metaLine}"><strong>Puerto despacho:</strong> ${escapeHtml(departurePort || "—")}</p>
<p style="${S.metaLine}"><strong>Puerto destino:</strong> ${escapeHtml(destinationPort || "—")}</p>
<p style="${S.metaLine}"><strong>ETA registrada:</strong> ${escapeHtml(etaFormatted || "—")}</p>
<p style="${S.metaLine}"><strong>Última señal recibida:</strong> ${escapeHtml(lastPositionAt || "—")}</p>
${coordsBlock}
<p style="${S.paragraph}">Revise el seguimiento en SICEN o en El Centinela (capa Posicionamiento SICEN).</p>
`;
}
