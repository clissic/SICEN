import express from "express";
import { shipFinesController } from "../controllers/shipFines.controller.js";
import {
  adminGuarded,
  contableGuarded,
  guarded,
} from "../middlewares/authChains.js";
import {
  uploadShipFineProveSlots,
  uploadShipFineProves,
} from "../middlewares/shipFineProvesUpload.middleware.js";

export const shipFinesRouter = express.Router();

shipFinesRouter.get("/getAll", ...adminGuarded, shipFinesController.getAll);
shipFinesRouter.get(
  "/paginated",
  ...guarded,
  shipFinesController.paginateList
);
shipFinesRouter.get("/mine", ...guarded, shipFinesController.mine);

shipFinesRouter.post(
  "/createAndRender",
  ...guarded,
  uploadShipFineProves,
  shipFinesController.createAndRender
);

shipFinesRouter.get(
  "/findBy/number/update",
  ...contableGuarded,
  shipFinesController.findByNumberAndRenderForUpdate
);
shipFinesRouter.get(
  "/update/:fine_number",
  ...contableGuarded,
  shipFinesController.findByNumberAndUpdate
);
shipFinesRouter.put(
  "/update/:fine_number",
  ...contableGuarded,
  uploadShipFineProveSlots,
  shipFinesController.findByNumberAndUpdate
);

shipFinesRouter.get(
  "/findBy/number/delete",
  ...adminGuarded,
  shipFinesController.findByNumberAndRenderForDelete
);
shipFinesRouter.get(
  "/delete/:fine_number",
  ...adminGuarded,
  shipFinesController.findByNumberAndDelete
);

shipFinesRouter.delete(
  "/:id",
  ...adminGuarded,
  shipFinesController.deleteOne
);
shipFinesRouter.get("/:id", ...guarded, shipFinesController.findById);
