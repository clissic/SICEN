import express from "express";
import { sessionsController } from "../controllers/sessions.controller.js";
import { optionalJwt } from "../middlewares/auth.js";
import { loginRateLimiter } from "../middlewares/rateLimiting.js";

export const sessionsRouter = express.Router();

sessionsRouter.get("/me", optionalJwt, sessionsController.me);

sessionsRouter.post("/signup", sessionsController.signup);

sessionsRouter.post("/login", loginRateLimiter, sessionsController.login);

sessionsRouter.post("/logout", sessionsController.logout);
