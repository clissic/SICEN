import { isValidUserUnitAsync } from "../constants/userUnits.js";

/** Tras `checkLogin`: exige unidad del JWT válida (lista histórica o alta en BD). */
export async function requireRegisteredUnit(req, res, next) {
  try {
    const raw = (req.user?.unit || "").trim();
    if (!raw || !(await isValidUserUnitAsync(raw))) {
      return res.status(403).json({
        ok: false,
        msg: "No tiene una unidad asignada válida para esta operación.",
      });
    }
    req.unitCode = raw.toUpperCase();
    next();
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "Error al validar la unidad.",
    });
  }
}
