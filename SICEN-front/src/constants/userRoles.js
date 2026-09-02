/**
 * Roles de usuario SICEN.
 * `value` = denominación en BD; `label` = texto en UI (desplegables).
 */
export const USER_ROLES = [
  { value: "user", label: "Funcionario de PNN" },
  { value: "skipper", label: "Náuta deportivo" },
  { value: "seaman", label: "Gente de mar" },
  { value: "agency", label: "Agente Marítimo" },
  { value: "admin", label: "Administrador" },
  { value: "superAdmin", label: "Super administrador" },
];

export const USER_ROLE_VALUES = USER_ROLES.map((r) => r.value);

/** Roles que un administrador puede asignar (sin superAdmin). */
export const ADMIN_EDIT_ROLES = USER_ROLES.filter(
  (r) => r.value !== "superAdmin"
);

/** Opciones de rol al crear usuario (admin: sin superAdmin). */
export const CREATE_USER_ROLE_OPTIONS_ADMIN = ADMIN_EDIT_ROLES;

/** Opciones de rol al crear usuario (superAdmin: todas). */
export const CREATE_USER_ROLE_OPTIONS_SUPERADMIN = USER_ROLES;

/** Filtro de listados (incluye «Todos»). */
export const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Todos los roles" },
  ...USER_ROLES,
];

const LABEL_BY_VALUE = Object.fromEntries(
  USER_ROLES.map((r) => [r.value, r.label])
);

export function userRoleLabel(role) {
  if (role == null || role === "") return "—";
  return LABEL_BY_VALUE[role] ?? String(role);
}

/** Roles con formulario operativo PNN (grado + unidad). */
export function roleUsesPnnFields(role) {
  return role !== "skipper";
}

export function isSkipperRole(role) {
  return role === "skipper";
}

/** Normaliza un rol para selects que no permiten editar superAdmin. */
export function normalizeRoleForSelect(role) {
  if (ADMIN_EDIT_ROLES.some((r) => r.value === role)) return role;
  return "user";
}
