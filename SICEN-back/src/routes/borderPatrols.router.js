import express from "express";
import { borderPatrolsController } from "../controllers/borderPatrols.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const borderPatrolsRouter = express.Router();

borderPatrolsRouter.get("/", ...guarded, borderPatrolsController.listByMonth);
borderPatrolsRouter.post("/", ...guarded, borderPatrolsController.create);
borderPatrolsRouter.patch(
  "/:id",
  ...guarded,
  borderPatrolsController.updateStatus
);
borderPatrolsRouter.delete(
  "/:id",
  ...guarded,
  borderPatrolsController.remove
);
