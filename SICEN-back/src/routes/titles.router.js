import express from "express";
import { titlesController } from "../controllers/titles.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const titlesRouter = express.Router();

titlesRouter.get("/", ...guarded, titlesController.list);
titlesRouter.post("/", ...guarded, titlesController.create);
titlesRouter.patch("/:id", ...guarded, titlesController.update);
titlesRouter.delete("/:id", ...guarded, titlesController.remove);
