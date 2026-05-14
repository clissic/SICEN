import express from "express";
import { vesselsController } from "../controllers/vessels.controller.js";
import { checkLogin, checkAdmin } from "../middlewares/auth.js";

export const vesselsRouter = express.Router();

vesselsRouter.get("/paginated", checkLogin, vesselsController.listPaginated);

vesselsRouter.get(
  "/by-business-id/:vesselId/for-edit",
  checkLogin,
  vesselsController.getVesselForEdit
);

vesselsRouter.get(
  "/by-business-id/:vesselId",
  checkLogin,
  vesselsController.getByBusinessId
);

vesselsRouter.put(
  "/by-business-id/:vesselId",
  checkLogin,
  vesselsController.updateVessel
);

vesselsRouter.delete(
  "/by-business-id/:vesselId",
  checkLogin,
  checkAdmin,
  vesselsController.deleteVessel
);

vesselsRouter.post(
  "/by-business-id/:vesselId/certificates",
  checkLogin,
  vesselsController.saveCertificate
);

vesselsRouter.post(
  "/by-business-id/:vesselId/extra-certificate-presets",
  checkLogin,
  vesselsController.addExtraCertificatePreset
);

vesselsRouter.post("/", checkLogin, vesselsController.createInitial);
