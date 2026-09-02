import express from "express";
import { vesselsController } from "../controllers/vessels.controller.js";
import { vesselAdminController } from "../controllers/vesselAdmin.controller.js";
import { adminGuarded, guarded } from "../middlewares/authChains.js";
import { uploadVesselAdminProofRequired } from "../middlewares/vesselAdminProofUpload.middleware.js";

export const vesselsRouter = express.Router();

vesselsRouter.get("/stats", ...guarded, vesselsController.getStats);

vesselsRouter.get(
  "/deportivo/by-owner",
  ...guarded,
  vesselsController.listDeportivoByOwner
);
vesselsRouter.post(
  "/deportivo/search-claim",
  ...guarded,
  vesselAdminController.searchClaim
);
vesselsRouter.get(
  "/deportivo/my-admin-status",
  ...guarded,
  vesselAdminController.myAdminStatus
);
vesselsRouter.post(
  "/deportivo/request-admin",
  ...guarded,
  uploadVesselAdminProofRequired,
  vesselAdminController.requestAdmin
);
vesselsRouter.post(
  "/deportivo/cancel-admin-request",
  ...guarded,
  vesselAdminController.cancelRequest
);
vesselsRouter.post(
  "/deportivo/unlink-vessel",
  ...guarded,
  vesselAdminController.skipperUnlink
);

vesselsRouter.get(
  "/admin-requests/preview",
  ...guarded,
  vesselAdminController.previewToken
);
vesselsRouter.get(
  "/admin-requests/:id/proof-document",
  ...guarded,
  vesselAdminController.proofDocument
);
vesselsRouter.post(
  "/admin-requests/:id/approve",
  ...guarded,
  vesselAdminController.approve
);
vesselsRouter.post(
  "/admin-requests/:id/reject",
  ...guarded,
  vesselAdminController.reject
);

vesselsRouter.get(
  "/by-business-id/:vesselId/admin-requests",
  ...guarded,
  vesselAdminController.listForVessel
);
vesselsRouter.post(
  "/by-business-id/:vesselId/administrators",
  ...guarded,
  vesselAdminController.addAdministrator
);
vesselsRouter.delete(
  "/by-business-id/:vesselId/administrators/:userId",
  ...guarded,
  vesselAdminController.removeAdministrator
);

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
