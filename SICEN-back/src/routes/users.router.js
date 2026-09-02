import express from "express";
import { usersController } from "../controllers/users.controller.js";
import {
  adminGuarded,
  loginOnly,
  selfOrAdminGuarded,
} from "../middlewares/authChains.js";
import { uploadAvatarOptional } from "../middlewares/avatarUpload.middleware.js";

export const usersRouter = express.Router();

usersRouter.post("/newAccount", usersController.sendNewAccEmail);

usersRouter.get(
  "/rejectAccountRequest/preview",
  ...adminGuarded,
  usersController.previewRejectAccountRequest
);

usersRouter.post(
  "/rejectAccountRequest",
  ...adminGuarded,
  usersController.rejectAccountRequest
);

usersRouter.post("/create", ...adminGuarded, usersController.create);

usersRouter.post(
  "/createAndSendEmail",
  ...adminGuarded,
  uploadAvatarOptional,
  usersController.createAndSendEmail
);

usersRouter.get("/paginated", ...adminGuarded, usersController.paginateList);

usersRouter.get("/", ...adminGuarded, usersController.getAll);

usersRouter.get(
  "/update/userUpdate",
  ...adminGuarded,
  usersController.findByIdAndRenderForUpdate
);

usersRouter.get(
  "/findBy/id/delete",
  ...adminGuarded,
  usersController.findByIdAndRenderForDelete
);

usersRouter.put(
  "/updateUser/:id",
  ...adminGuarded,
  uploadAvatarOptional,
  usersController.findByIdAndUpdate
);

usersRouter.get("/delete/:id", ...adminGuarded, usersController.findByIdAndDelete);

usersRouter.post(
  "/updatePasswordForm",
  ...loginOnly,
  usersController.updatePasswordAndRender
);

usersRouter.post(
  "/updateDataForm",
  ...loginOnly,
  usersController.updateDataAndRender
);

usersRouter.post(
  "/complete-user-tutorial",
  ...loginOnly,
  usersController.completeUserTutorial
);

usersRouter.get("/:id", ...selfOrAdminGuarded, usersController.findById);
