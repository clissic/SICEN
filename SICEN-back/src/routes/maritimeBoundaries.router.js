import express from "express";
import { maritimeBoundariesController } from "../controllers/maritimeBoundaries.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const maritimeBoundariesRouter = express.Router();

maritimeBoundariesRouter.get(
  "/catalog",
  ...guarded,
  maritimeBoundariesController.catalog
);
maritimeBoundariesRouter.get(
  "/",
  ...guarded,
  maritimeBoundariesController.layers
);
