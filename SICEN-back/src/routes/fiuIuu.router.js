import express from "express";
import { fiuIuuController } from "../controllers/fiuIuu.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const fiuIuuRouter = express.Router();

fiuIuuRouter.get("/status", ...guarded, fiuIuuController.status);
fiuIuuRouter.post("/events", ...guarded, fiuIuuController.events);
