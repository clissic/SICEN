import express from "express";
import { sportMovementsController } from "../controllers/sportMovements.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const sportMovementsRouter = express.Router();

sportMovementsRouter.get(
  "/dispatches",
  ...guarded,
  sportMovementsController.listDispatches
);
sportMovementsRouter.get(
  "/dispatches/confirmed",
  ...guarded,
  sportMovementsController.listConfirmedDispatches
);
sportMovementsRouter.get(
  "/arrivals",
  ...guarded,
  sportMovementsController.listArrivals
);
sportMovementsRouter.get(
  "/delayed/alert",
  ...guarded,
  sportMovementsController.delayedAlert
);
sportMovementsRouter.get(
  "/delayed",
  ...guarded,
  sportMovementsController.listDelayed
);
sportMovementsRouter.get(
  "/closed",
  ...guarded,
  sportMovementsController.listClosed
);
sportMovementsRouter.get(
  "/availability/vessel/:vesselId",
  ...guarded,
  sportMovementsController.checkVessel
);

sportMovementsRouter.post("/", ...guarded, sportMovementsController.create);

sportMovementsRouter.get("/:id", ...guarded, sportMovementsController.getById);
sportMovementsRouter.put("/:id", ...guarded, sportMovementsController.update);
sportMovementsRouter.post(
  "/:id/confirm",
  ...guarded,
  sportMovementsController.confirm
);
sportMovementsRouter.post(
  "/:id/renew",
  ...guarded,
  sportMovementsController.renew
);
sportMovementsRouter.post(
  "/:id/close",
  ...guarded,
  sportMovementsController.close
);
sportMovementsRouter.post(
  "/:id/cancel",
  ...guarded,
  sportMovementsController.cancelConfirmed
);
sportMovementsRouter.delete(
  "/:id",
  ...guarded,
  sportMovementsController.remove
);
