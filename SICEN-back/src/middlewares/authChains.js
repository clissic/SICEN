import {
  checkAdmin,
  checkAdminOrContable,
  checkLogin,
  checkSelfOrAdmin,
  checkUserTutorial,
} from "./auth.js";
import { requireRegisteredUnit } from "./jwtUnitRegistered.middleware.js";

/** Autenticación sin exigir tutorial (perfil, unidad en inicio, completar curso). */
export const loginOnly = [checkLogin];

/** Rutas protegidas: login y luego tutorial (último middleware). */
export const guarded = [checkLogin, checkUserTutorial];

/** Admin + tutorial (tutorial después del rol). */
export const adminGuarded = [checkLogin, checkAdmin, checkUserTutorial];

/** Propio usuario o admin + tutorial. */
export const selfOrAdminGuarded = [
  checkLogin,
  checkSelfOrAdmin,
  checkUserTutorial,
];

/** Multas vehiculares (admin o contable) + tutorial. */
export const contableGuarded = [
  checkLogin,
  checkAdminOrContable,
  checkUserTutorial,
];

/** Archivos de unidad (lectura). */
export const unitFilesReadGuarded = [
  checkLogin,
  requireRegisteredUnit,
  checkUserTutorial,
];

/** Archivos de unidad (solo admin). */
export const unitFilesAdminGuarded = [
  checkLogin,
  requireRegisteredUnit,
  checkAdmin,
  checkUserTutorial,
];
