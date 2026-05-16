import express from "express";
import { licencesController } from "../controllers/licences.controller.js";
import { checkLogin } from "../middlewares/auth.js";

export const licencesRouter = express.Router();

licencesRouter.get("/", checkLogin, licencesController.list);
licencesRouter.post("/", checkLogin, licencesController.create);
licencesRouter.patch("/:id", checkLogin, licencesController.update);
licencesRouter.delete("/:id", checkLogin, licencesController.remove);
