import express from "express";
import { gfwController } from "../controllers/gfw.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const gfwRouter = express.Router();

gfwRouter.get("/status", ...guarded, gfwController.status);
gfwRouter.post("/events", ...guarded, gfwController.events);
gfwRouter.post("/insights", ...guarded, gfwController.insights);
