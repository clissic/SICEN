import express from "express";
import { borderPatrolTypesController } from "../controllers/borderPatrolTypes.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const borderPatrolTypesRouter = express.Router();

borderPatrolTypesRouter.get("/", ...guarded, borderPatrolTypesController.list);
borderPatrolTypesRouter.post("/", ...guarded, borderPatrolTypesController.create);
borderPatrolTypesRouter.patch(
  "/:id",
  ...guarded,
  borderPatrolTypesController.update
);
borderPatrolTypesRouter.delete(
  "/:id",
  ...guarded,
  borderPatrolTypesController.remove
);
