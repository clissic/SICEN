import express from "express";
import { mapMarkersController } from "../controllers/mapMarkers.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const mapMarkersRouter = express.Router();

mapMarkersRouter.get("/", ...guarded, mapMarkersController.list);
mapMarkersRouter.post("/", ...guarded, mapMarkersController.create);
mapMarkersRouter.put("/:id", ...guarded, mapMarkersController.update);
mapMarkersRouter.delete("/:id", ...guarded, mapMarkersController.remove);
