import express from "express";
import { currentsController } from "../controllers/currents.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const currentsRouter = express.Router();

currentsRouter.post("/points", ...guarded, currentsController.points);
