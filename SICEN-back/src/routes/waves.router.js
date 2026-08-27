import express from "express";
import { wavesController } from "../controllers/waves.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const wavesRouter = express.Router();

wavesRouter.post("/points", ...guarded, wavesController.points);
