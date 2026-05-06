import express from "express";
import { usersController } from "../controllers/users.controller.js";
import { checkLogin, checkAdmin, checkSelfOrAdmin } from "../middlewares/auth.js";

export const usersRouter = express.Router();

usersRouter.post("/newAccount", usersController.sendNewAccEmail);

usersRouter.post("/create", checkLogin, checkAdmin, usersController.create);

usersRouter.post("/createAndSendEmail", checkLogin, checkAdmin, usersController.createAndSendEmail);

usersRouter.get("/paginated", checkLogin, checkAdmin, usersController.paginateList);

usersRouter.get("/", checkLogin, checkAdmin, usersController.getAll);

usersRouter.get("/update/userUpdate", checkLogin, checkAdmin, usersController.findByIdAndRenderForUpdate);

usersRouter.get("/findBy/id/delete", checkLogin, checkAdmin, usersController.findByIdAndRenderForDelete);

usersRouter.get("/updateUser/:id", checkLogin, checkAdmin, usersController.findByIdAndUpdate);
usersRouter.put("/updateUser/:id", checkLogin, checkAdmin, usersController.findByIdAndUpdate);

usersRouter.get("/delete/:id", checkLogin, checkAdmin, usersController.findByIdAndDelete);

usersRouter.post("/updatePasswordForm", checkLogin, usersController.updatePasswordAndRender);

usersRouter.post("/updateDataForm", checkLogin, usersController.updateDataAndRender);

usersRouter.get("/:id", checkLogin, checkSelfOrAdmin, usersController.findById);
