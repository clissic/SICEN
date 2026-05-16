import express from "express";
import { titlesController } from "../controllers/titles.controller.js";
import { checkLogin } from "../middlewares/auth.js";

export const titlesRouter = express.Router();

titlesRouter.get("/", checkLogin, titlesController.list);
titlesRouter.post("/", checkLogin, titlesController.create);
titlesRouter.patch("/:id", checkLogin, titlesController.update);
titlesRouter.delete("/:id", checkLogin, titlesController.remove);
