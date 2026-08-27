import express from "express";
import { windController } from "../controllers/wind.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const windRouter = express.Router();

windRouter.post("/points", ...guarded, windController.points);
