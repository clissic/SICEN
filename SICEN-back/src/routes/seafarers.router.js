import express from "express";
import { seafarersController } from "../controllers/seafarers.controller.js";
import { checkLogin } from "../middlewares/auth.js";
import { adminGuarded, guarded } from "../middlewares/authChains.js";

export const seafarersRouter = express.Router();

seafarersRouter.get("/stats", ...guarded, seafarersController.getStats);
seafarersRouter.get("/by-document", ...guarded, seafarersController.findByDocument);
seafarersRouter.delete(
  "/:id",
  ...adminGuarded,
  seafarersController.removeSeafarer,
);
seafarersRouter.get(
  "/metadata/courses",
  checkLogin,
  seafarersController.metadataCourses,
);
seafarersRouter.get(
  "/metadata/sanctions",
  checkLogin,
  seafarersController.metadataSanctions,
);
seafarersRouter.get("/:id", ...guarded, seafarersController.getById);
seafarersRouter.post("/", ...guarded, seafarersController.create);
seafarersRouter.patch(
  "/:id/basic-data",
  ...guarded,
  seafarersController.updateBasicData,
);
seafarersRouter.patch(
  "/:id/titles/:entryId",
  ...guarded,
  seafarersController.updateHeldTitle,
);
seafarersRouter.delete(
  "/:id/titles/:entryId",
  ...guarded,
  seafarersController.removeHeldTitle,
);
seafarersRouter.post(
  "/:id/titles",
  ...guarded,
  seafarersController.addTitle,
);
seafarersRouter.patch(
  "/:id/held-licenses/:entryId",
  ...guarded,
  seafarersController.updateHeldLicense,
);
seafarersRouter.delete(
  "/:id/held-licenses/:entryId",
  ...guarded,
  seafarersController.removeHeldLicense,
);
seafarersRouter.post(
  "/:id/held-licenses",
  ...guarded,
  seafarersController.addHeldLicense,
);
seafarersRouter.post(
  "/:id/licenses",
  ...guarded,
  seafarersController.addLicense,
);
seafarersRouter.post("/:id/courses", ...guarded, seafarersController.addCourse);
seafarersRouter.post(
  "/:id/sanctions",
  ...guarded,
  seafarersController.addSanction,
);
seafarersRouter.post(
  "/:id/observations",
  ...guarded,
  seafarersController.addObservation,
);
