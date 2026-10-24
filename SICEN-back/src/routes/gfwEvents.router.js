import express from "express";
import { gfwEventsController } from "../controllers/gfwEvents.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const gfwEventsRouter = express.Router();

gfwEventsRouter.post("/events", ...guarded, gfwEventsController.searchEvents);
gfwEventsRouter.get("/status", ...guarded, gfwEventsController.getStatus);
