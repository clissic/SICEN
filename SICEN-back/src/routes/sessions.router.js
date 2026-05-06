import express from "express";
import { sessionsController } from "../controllers/sessions.controller.js";
import { optionalJwt } from "../middlewares/auth.js";

export const sessionsRouter = express.Router();

sessionsRouter.get("/me", optionalJwt, sessionsController.me);

sessionsRouter.post("/signup", sessionsController.signup);

sessionsRouter.post("/login", sessionsController.login);

sessionsRouter.post("/logout", sessionsController.logout);
