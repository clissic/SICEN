import express from "express";
import { shipFinesController } from "../controllers/shipFines.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const shipFinesRouter = express.Router();

shipFinesRouter.post("/create", ...guarded, shipFinesController.create);

shipFinesRouter.get(
  "/by-vessel/:vesselId",
  ...guarded,
  shipFinesController.listByVessel,
);

shipFinesRouter.put(
  "/update/:fine_number",
  ...guarded,
  shipFinesController.updateByNumber,
);

shipFinesRouter.delete("/:id", ...guarded, shipFinesController.deleteById);

shipFinesRouter.get("/:id", ...guarded, shipFinesController.findById);
