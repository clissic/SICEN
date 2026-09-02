/**
 * Prefill de «Nuevo usuario» desde una solicitud de cuenta (email → link).
 * Payload compacto en query `?prefill=` (base64url JSON UTF-8).
 */

import { USER_ROLE_VALUES } from "../constants/userRoles.js";

/** accountType del wizard público → role en BD. */
export const ACCOUNT_TYPE_TO_ROLE = Object.freeze({
  "pnn-funcionario": "user",
  "nauta-deportivo": "skipper",
  "agente-maritimo": "agency",
  "gente-de-mar": "seaman",
});

export function roleFromAccountType(accountType) {
  return ACCOUNT_TYPE_TO_ROLE[accountType] || "user";
}

function truncateNote(text, max = 400) {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function str(v) {
  return v == null ? "" : String(v).trim();
}

/**
 * Decodifica `prefill` de la URL. Devuelve null si es inválido.
 */
export function parseNewUserPrefillParam(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  try {
    const json = decodeBase64UrlUtf8(String(raw).trim());
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return null;
    const role = USER_ROLE_VALUES.includes(data.role) ? data.role : "user";
    return {
      role,
      first_name: str(data.first_name),
      last_name: str(data.last_name),
      email: str(data.email),
      rank: str(data.rank),
      unit: str(data.unit),
      documentId: str(data.documentId),
      phone: str(data.phone),
      birthDate: str(data.birthDate),
      note: str(data.note),
    };
  } catch {
    return null;
  }
}

function decodeBase64UrlUtf8(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Arma el objeto de prefill a partir de los campos de la solicitud pública.
 * Para náuta, el teléfono viaja en `position` (mismo contrato del email).
 */
export function buildNewUserPrefillFromRequest({
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
  const isSkipper = role === "skipper";
  return {
    role,
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
