/** Roles que deben usar TOTP (Google Authenticator u otra app compatible). */
export const MFA_REQUIRED_ROLES = ["admin", "superAdmin"];

export const MFA_REQUIRED_ROLE_SET = new Set(MFA_REQUIRED_ROLES);

export function roleRequiresMfa(role) {
  return MFA_REQUIRED_ROLE_SET.has(role);
}

export const MFA_ISSUER = "SICEN";
export const MFA_DIGITS = 6;
export const MFA_PERIOD_SECONDS = 30;
export const MFA_WINDOW = 1;
export const MFA_RECOVERY_CODE_COUNT = 10;
export const MFA_MAX_FAILED_ATTEMPTS = 5;
export const MFA_LOCK_MS = 15 * 60 * 1000;
export const MFA_VERIFY_RATE_MAX = 10;
export const MFA_VERIFY_RATE_WINDOW_MS = 15 * 60 * 1000;
