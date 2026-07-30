import express from "express";
import { vesselsController } from "../controllers/vessels.controller.js";
import { adminGuarded, guarded } from "../middlewares/authChains.js";

export const vesselsRouter = express.Router();

vesselsRouter.get("/stats", ...guarded, vesselsController.getStats);

vesselsRouter.get("/paginated", ...guarded, vesselsController.listPaginated);
vesselsRouter.get(
  "/all-paginated",
  ...guarded,
  vesselsController.listAllPaginated,
);
vesselsRouter.get(
  "/by-type/:vesselType/search",
  ...guarded,
  vesselsController.searchByType,
);
vesselsRouter.get(
  "/by-type/:vesselType",
  ...guarded,
  vesselsController.listByType,
);

vesselsRouter.get(
  "/by-business-id/:vesselId/for-edit",
  ...guarded,
  vesselsController.getVesselForEdit
);

vesselsRouter.get(
  "/by-business-id/:vesselId",
  ...guarded,
  vesselsController.getByBusinessId
);

vesselsRouter.put(
  "/by-business-id/:vesselId",
  ...guarded,
  vesselsController.updateVessel
);

vesselsRouter.delete(
  "/by-business-id/:vesselId",
  ...adminGuarded,
  vesselsController.deleteVessel
);

vesselsRouter.post(
  "/by-business-id/:vesselId/certificates",
  ...guarded,
  vesselsController.saveCertificate
);

vesselsRouter.post(
  "/by-business-id/:vesselId/extra-certificate-presets",
  ...guarded,
  vesselsController.addExtraCertificatePreset
);

vesselsRouter.post("/", ...guarded, vesselsController.createInitial);
