import express from "express";
import { aisController } from "../controllers/ais.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const aisRouter = express.Router();

aisRouter.get("/status", ...guarded, aisController.status);
aisRouter.get("/vessels", ...guarded, aisController.vessels);
aisRouter.get("/stream", ...guarded, aisController.stream);
