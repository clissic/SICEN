import express from "express";
import { unitsController } from "../controllers/units.controller.js";
import { adminGuarded, loginOnly } from "../middlewares/authChains.js";
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

unitsRouter.get("/public", unitsController.listPublic);

unitsRouter.get("/", ...loginOnly, unitsController.list);

unitsRouter.post(
  "/",
  ...adminGuarded,
  wrapUpload(unitShieldUpload, unitsController.create)
);

unitsRouter.get("/:acronym", ...loginOnly, unitsController.getOne);

unitsRouter.put(
  "/:acronym",
  ...adminGuarded,
  wrapUpload(unitShieldUpload, unitsController.update)
);

unitsRouter.delete("/:acronym", ...adminGuarded, unitsController.remove);
