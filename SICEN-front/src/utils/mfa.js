export const MFA_TOTP_PATTERN = /^\d{6}$/;

export function normalizeMfaCode(value) {
  return String(value ?? "").replace(/\s/g, "").toUpperCase();
}

export function isTotpCode(value) {
  return MFA_TOTP_PATTERN.test(String(value ?? "").replace(/\s/g, ""));
}

export function isRecoveryCode(value) {
  return /^[A-F0-9]{8}$/.test(normalizeMfaCode(value).replace(/-/g, ""));
}

export function loginStepFromResponse(data) {
  if (data?.mfaRequired && data?.mfaEnrollmentRequired) return "enroll";
  if (data?.mfaRequired) return "verify";
  if (data?.token) return "done";
  return "credentials";
}

export function formatRecoveryCode(value) {
  const n = normalizeMfaCode(value).replace(/-/g, "");
  if (n.length !== 8) return n;
  return `${n.slice(0, 4)}-${n.slice(4)}`;
}
