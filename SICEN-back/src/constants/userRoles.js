/**
 * Roles de usuario SICEN (denominación en BD).
 * Las etiquetas de UI viven en SICEN-front/src/constants/userRoles.js.
 */
export const USER_ROLE_VALUES = [
  "user",
  "skipper",
  "seaman",
  "agency",
  "admin",
  "superAdmin",
];

export const USER_ROLE_SET = new Set(USER_ROLE_VALUES);

/** Roles asignables por un admin (sin superAdmin). */
export const ADMIN_ASSIGNABLE_ROLES = USER_ROLE_VALUES.filter(
  (r) => r !== "superAdmin"
);
