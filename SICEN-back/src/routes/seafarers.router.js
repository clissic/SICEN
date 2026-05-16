import express from "express";
import { seafarersController } from "../controllers/seafarers.controller.js";
import { checkLogin } from "../middlewares/auth.js";

export const seafarersRouter = express.Router();

seafarersRouter.get("/by-document", checkLogin, seafarersController.findByDocument);
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
seafarersRouter.post("/", checkLogin, seafarersController.create);
seafarersRouter.patch(
  "/:id/titles/:entryId",
  checkLogin,
  seafarersController.updateHeldTitle,
);
seafarersRouter.delete(
  "/:id/titles/:entryId",
  checkLogin,
  seafarersController.removeHeldTitle,
);
seafarersRouter.post(
  "/:id/titles",
  checkLogin,
  seafarersController.addTitle,
);
seafarersRouter.patch(
  "/:id/held-licenses/:entryId",
  checkLogin,
  seafarersController.updateHeldLicense,
);
seafarersRouter.delete(
  "/:id/held-licenses/:entryId",
  checkLogin,
  seafarersController.removeHeldLicense,
);
seafarersRouter.post(
  "/:id/held-licenses",
  checkLogin,
  seafarersController.addHeldLicense,
);
seafarersRouter.post(
  "/:id/licenses",
  checkLogin,
  seafarersController.addLicense,
);
seafarersRouter.post("/:id/courses", checkLogin, seafarersController.addCourse);
seafarersRouter.post(
  "/:id/sanctions",
  checkLogin,
  seafarersController.addSanction,
);
seafarersRouter.post(
  "/:id/observations",
  checkLogin,
  seafarersController.addObservation,
);
