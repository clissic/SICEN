import express from "express";
import { unitFilesController } from "../controllers/unitFiles.controller.js";
import { checkAdmin, checkLogin } from "../middlewares/auth.js";
import { requireRegisteredUnit } from "../middlewares/jwtUnitRegistered.middleware.js";
import { procedimientosUploadSingle } from "../middlewares/procedimientosUpload.middleware.js";

export const unitFilesRouter = express.Router();

unitFilesRouter.get(
  "/procedimientos-div-i",
  checkLogin,
  requireRegisteredUnit,
  unitFilesController.listProcedimientosDivI
);
unitFilesRouter.get(
  "/procedimientos-div-ii",
  checkLogin,
  requireRegisteredUnit,
  unitFilesController.listProcedimientosDivII
);

function wrapUpload(multerMw, handler) {
  return (req, res, next) => {
    multerMw(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "El archivo supera el tamaño máximo permitido (40 MB)."
            : err.message || "Error al procesar el archivo.";
        return res.status(400).json({ ok: false, msg });
      }
      return handler(req, res, next);
    });
  };
}

unitFilesRouter.post(
  "/procedimientos-div-i/upload",
  checkLogin,
  requireRegisteredUnit,
  checkAdmin,
  wrapUpload(
    procedimientosUploadSingle("DIV-I"),
    unitFilesController.uploadProcedimientosDivI
  )
);
unitFilesRouter.post(
  "/procedimientos-div-ii/upload",
  checkLogin,
  requireRegisteredUnit,
  checkAdmin,
  wrapUpload(
    procedimientosUploadSingle("DIV-II"),
    unitFilesController.uploadProcedimientosDivII
  )
);

unitFilesRouter.delete(
  "/procedimientos-div-i/file",
  checkLogin,
  requireRegisteredUnit,
  checkAdmin,
  unitFilesController.deleteProcedimientosDivI
);
unitFilesRouter.delete(
  "/procedimientos-div-ii/file",
  checkLogin,
  requireRegisteredUnit,
  checkAdmin,
  unitFilesController.deleteProcedimientosDivII
);
