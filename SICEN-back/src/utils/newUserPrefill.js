/**
 * Link «Crear cuenta» en el correo de solicitud → `/usuarios/nuevo?prefill=…`
 * (base64url JSON). El front exige sesión admin/superAdmin.
 */

import env from "../config/env.config.js";
import { USER_ROLE_SET } from "../constants/userRoles.js";

const ACCOUNT_TYPE_TO_ROLE = Object.freeze({
  "pnn-funcionario": "user",
  "nauta-deportivo": "skipper",
  "agente-maritimo": "agency",
  "gente-de-mar": "seaman",
});

function str(v) {
  return v == null ? "" : String(v).trim();
}

function truncateNote(text, max = 400) {
  const s = str(text);
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function roleFromAccountType(accountType) {
  return ACCOUNT_TYPE_TO_ROLE[accountType] || "user";
}

/**
 * Payload alineado con `SICEN-front/src/utils/newUserPrefill.js`.
 */
export function buildNewUserPrefillPayload({
  accountType,
  first_name,
  last_name,
  rank,
  unit,
  position,
  email,
  documentId,
  birthDate,
  newAccBody,
}) {
  const role = roleFromAccountType(accountType);
  const safeRole = USER_ROLE_SET.has(role) ? role : "user";
  const isSkipper = safeRole === "skipper";
  return {
    role: safeRole,
    first_name: str(first_name),
    last_name: str(last_name),
    email: str(email),
    rank: isSkipper ? "" : str(rank),
    unit: isSkipper ? "" : str(unit),
    documentId: isSkipper ? str(documentId) : "",
    phone: isSkipper ? str(position) : "",
    birthDate: isSkipper ? str(birthDate) : "",
    note: truncateNote(newAccBody),
  };
}

export function encodeNewUserPrefill(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** URL absoluta para el botón del correo. */
export function buildCreateUserFromRequestHref(fields) {
  const payload = buildNewUserPrefillPayload(fields);
  const encoded = encodeNewUserPrefill(payload);
  const base = String(env.publicAppUrl || "").replace(/\/+$/, "");
  return `${base}/usuarios/nuevo?prefill=${encoded}`;
}
