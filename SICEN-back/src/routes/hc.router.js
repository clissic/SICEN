import express from "express";
import { hcController } from "../controllers/hc.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const hcRouter = express.Router();

hcRouter.get("/status", ...guarded, hcController.status);
hcRouter.post("/simulate", ...guarded, hcController.simulate);
hcRouter.get("/jobs/:id", ...guarded, hcController.job);
