import express from "express";
import { skylightController } from "../controllers/skylight.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const skylightRouter = express.Router();

skylightRouter.get("/status", ...guarded, skylightController.status);
skylightRouter.get("/image-chip", ...guarded, skylightController.imageChip);
skylightRouter.post("/events", ...guarded, skylightController.events);
skylightRouter.post("/frames", ...guarded, skylightController.frames);
skylightRouter.post("/aois", ...guarded, skylightController.aois);
skylightRouter.post(
  "/vessel-dossier",
  ...guarded,
  skylightController.vesselDossier
);
