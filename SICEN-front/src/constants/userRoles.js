/** Roles que un administrador puede asignar en formularios de usuario. */
export const ADMIN_EDIT_ROLES = [
  { value: "user", label: "user" },
  { value: "admin", label: "admin" },
];

/** Opciones de rol al crear usuario (admin: sin superAdmin). */
export const CREATE_USER_ROLE_OPTIONS_ADMIN = [
  { value: "user", label: "Usuario" },
  { value: "admin", label: "Administrador" },
];

/** Opciones de rol al crear usuario (superAdmin: las tres). */
export const CREATE_USER_ROLE_OPTIONS_SUPERADMIN = [
  ...CREATE_USER_ROLE_OPTIONS_ADMIN,
  { value: "superAdmin", label: "Super administrador" },
];

export function normalizeRoleForSelect(role) {
  if (role === "user" || role === "admin") return role;
  return "user";
}
