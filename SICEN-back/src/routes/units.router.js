import express from "express";
import { unitsController } from "../controllers/units.controller.js";
import { checkLogin, checkAdmin } from "../middlewares/auth.js";
import { unitShieldUpload } from "../middlewares/unitCreateUpload.middleware.js";

export const unitsRouter = express.Router();

function wrapUpload(multerMw, handler) {
  return (req, res, next) => {
    multerMw(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "El archivo supera el tamaño máximo permitido (1 GB)."
            : err.message || "Error al procesar el archivo.";
        return res.status(400).json({ ok: false, msg });
      }
      return handler(req, res, next);
    });
  };
}

unitsRouter.get("/", checkLogin, unitsController.list);

unitsRouter.post(
  "/",
  checkLogin,
  checkAdmin,
  wrapUpload(unitShieldUpload, unitsController.create)
);

unitsRouter.get("/:acronym", checkLogin, unitsController.getOne);

unitsRouter.put(
  "/:acronym",
  checkLogin,
  checkAdmin,
  wrapUpload(unitShieldUpload, unitsController.update)
);

unitsRouter.delete(
  "/:acronym",
  checkLogin,
  checkAdmin,
  unitsController.remove
);
