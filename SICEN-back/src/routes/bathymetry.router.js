import express from "express";
import { bathymetryController } from "../controllers/bathymetry.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const bathymetryRouter = express.Router();

bathymetryRouter.post("/points", ...guarded, bathymetryController.points);
