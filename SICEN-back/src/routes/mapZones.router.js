import express from "express";
import { mapZonesController } from "../controllers/mapZones.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const mapZonesRouter = express.Router();

mapZonesRouter.get("/", ...guarded, mapZonesController.list);
mapZonesRouter.post("/", ...guarded, mapZonesController.create);
mapZonesRouter.put("/:id", ...guarded, mapZonesController.update);
mapZonesRouter.delete("/:id", ...guarded, mapZonesController.remove);
