import express from "express";
import { vesselInspectionsController } from "../controllers/vesselInspections.controller.js";
import { adminGuarded, guarded } from "../middlewares/authChains.js";
import { uploadInspectionPdf } from "../middlewares/inspectionPdfUpload.middleware.js";

export const vesselInspectionsRouter = express.Router();

vesselInspectionsRouter.get(
  "/stats",
  ...guarded,
  vesselInspectionsController.getStats
);

vesselInspectionsRouter.get(
  "/years",
  ...guarded,
  vesselInspectionsController.listYears
);

vesselInspectionsRouter.get(
  "/paginated",
  ...guarded,
  vesselInspectionsController.listPaginated
);

vesselInspectionsRouter.post(
  "/",
  ...guarded,
  uploadInspectionPdf,
  vesselInspectionsController.create
);

vesselInspectionsRouter.get(
  "/:id",
  ...guarded,
  vesselInspectionsController.getById
);

vesselInspectionsRouter.put(
  "/:id",
  ...guarded,
  uploadInspectionPdf,
  vesselInspectionsController.update
);

vesselInspectionsRouter.delete(
  "/:id",
  ...adminGuarded,
  vesselInspectionsController.remove
);
