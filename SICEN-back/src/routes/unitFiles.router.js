import express from "express";
import { unitFilesController } from "../controllers/unitFiles.controller.js";
import {
  unitFilesAdminGuarded,
  unitFilesReadGuarded,
} from "../middlewares/authChains.js";
import { procedimientosUploadSingle } from "../middlewares/procedimientosUpload.middleware.js";

export const unitFilesRouter = express.Router();

unitFilesRouter.get(
  "/procedimientos-div-i",
  ...unitFilesReadGuarded,
  unitFilesController.listProcedimientosDivI,
);
unitFilesRouter.get(
  "/procedimientos-div-ii",
  ...unitFilesReadGuarded,
  unitFilesController.listProcedimientosDivII,
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
  ...unitFilesAdminGuarded,
  wrapUpload(
    procedimientosUploadSingle("DIV-I"),
    unitFilesController.uploadProcedimientosDivI,
  ),
);
unitFilesRouter.post(
  "/procedimientos-div-ii/upload",
  ...unitFilesAdminGuarded,
  wrapUpload(
    procedimientosUploadSingle("DIV-II"),
    unitFilesController.uploadProcedimientosDivII,
  ),
);

unitFilesRouter.delete(
  "/procedimientos-div-i/file",
  ...unitFilesAdminGuarded,
  unitFilesController.deleteProcedimientosDivI,
);
unitFilesRouter.delete(
  "/procedimientos-div-ii/file",
  ...unitFilesAdminGuarded,
  unitFilesController.deleteProcedimientosDivII,
);
