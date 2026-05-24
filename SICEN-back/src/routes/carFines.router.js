import express from "express";
import { carFinesController } from "../controllers/carFines.controller.js";
import {
  adminGuarded,
  contableGuarded,
  guarded,
} from "../middlewares/authChains.js";
import {
  uploadCarFineProveSlots,
  uploadCarFineProves,
} from "../middlewares/carFineProvesUpload.middleware.js";

export const carFinesRouter = express.Router();

carFinesRouter.get("/getAll", ...adminGuarded, carFinesController.getAll);
carFinesRouter.get("/paginated", ...guarded, carFinesController.paginateList);
carFinesRouter.get("/mine", ...guarded, carFinesController.mine);
carFinesRouter.get("/counts", ...guarded, carFinesController.getCounts);
carFinesRouter.get("/stats", ...guarded, carFinesController.getStats);

carFinesRouter.post("/create", ...guarded, carFinesController.create);
carFinesRouter.post(
  "/createAndRender",
  ...guarded,
  uploadCarFineProves,
  carFinesController.createAndRender
);

carFinesRouter.get(
  "/findBy/number/update",
  ...contableGuarded,
  carFinesController.findByNumberAndRenderForUpdate,
);
carFinesRouter.get(
  "/update/:fine_number",
  ...contableGuarded,
  carFinesController.findByNumberAndUpdate,
);
carFinesRouter.put(
  "/update/:fine_number",
  ...contableGuarded,
  uploadCarFineProveSlots,
  carFinesController.findByNumberAndUpdate,
);

carFinesRouter.get(
  "/findBy/number/delete",
  ...adminGuarded,
  carFinesController.findByNumberAndRenderForDelete,
);
carFinesRouter.get(
  "/delete/:fine_number",
  ...adminGuarded,
  carFinesController.findByNumberAndDelete,
);

carFinesRouter.delete("/:id", ...adminGuarded, carFinesController.deleteOne);
carFinesRouter.get("/:id", ...guarded, carFinesController.findById);
