import express from "express";
import { mapMeasurementsController } from "../controllers/mapMeasurements.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const mapMeasurementsRouter = express.Router();

mapMeasurementsRouter.get("/", ...guarded, mapMeasurementsController.list);
mapMeasurementsRouter.post("/", ...guarded, mapMeasurementsController.create);
mapMeasurementsRouter.put("/:id", ...guarded, mapMeasurementsController.update);
mapMeasurementsRouter.delete(
  "/:id",
  ...guarded,
  mapMeasurementsController.remove
);
