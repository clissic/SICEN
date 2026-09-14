import express from "express";
import { sarController } from "../controllers/sar.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const sarRouter = express.Router();

sarRouter.get("/status", ...guarded, sarController.status);
sarRouter.post("/simulate", ...guarded, sarController.simulate);
sarRouter.get("/jobs/:id", ...guarded, sarController.job);
