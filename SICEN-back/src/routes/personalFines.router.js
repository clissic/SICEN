import express from "express";
import { personalFinesController } from "../controllers/personalFines.controller.js";
import {
  adminGuarded,
  contableGuarded,
  guarded,
} from "../middlewares/authChains.js";
import {
  uploadPersonalFineProveSlots,
  uploadPersonalFineProves,
} from "../middlewares/personalFineProvesUpload.middleware.js";

export const personalFinesRouter = express.Router();

personalFinesRouter.get(
  "/getAll",
  ...adminGuarded,
  personalFinesController.getAll
);
personalFinesRouter.get(
  "/paginated",
  ...guarded,
  personalFinesController.paginateList
);
personalFinesRouter.get("/mine", ...guarded, personalFinesController.mine);
personalFinesRouter.get(
  "/counts",
  ...guarded,
  personalFinesController.getCounts
);
personalFinesRouter.get(
  "/stats",
  ...guarded,
  personalFinesController.getStats
);

personalFinesRouter.post(
  "/createAndRender",
  ...guarded,
  uploadPersonalFineProves,
  personalFinesController.createAndRender
);

personalFinesRouter.get(
  "/findBy/number/update",
  ...contableGuarded,
  personalFinesController.findByNumberAndRenderForUpdate
);
personalFinesRouter.get(
  "/update/:fine_number",
  ...contableGuarded,
  personalFinesController.findByNumberAndUpdate
);
personalFinesRouter.put(
  "/update/:fine_number",
  ...contableGuarded,
  uploadPersonalFineProveSlots,
  personalFinesController.findByNumberAndUpdate
);

personalFinesRouter.get(
  "/findBy/number/delete",
  ...adminGuarded,
  personalFinesController.findByNumberAndRenderForDelete
);
personalFinesRouter.get(
  "/delete/:fine_number",
  ...adminGuarded,
  personalFinesController.findByNumberAndDelete
);

personalFinesRouter.delete(
  "/:id",
  ...adminGuarded,
  personalFinesController.deleteOne
);
personalFinesRouter.get(
  "/:id",
  ...guarded,
  personalFinesController.findById
);
