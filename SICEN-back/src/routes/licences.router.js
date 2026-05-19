import express from "express";
import { licencesController } from "../controllers/licences.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const licencesRouter = express.Router();

licencesRouter.get("/", ...guarded, licencesController.list);
licencesRouter.post("/", ...guarded, licencesController.create);
licencesRouter.patch("/:id", ...guarded, licencesController.update);
licencesRouter.delete("/:id", ...guarded, licencesController.remove);
