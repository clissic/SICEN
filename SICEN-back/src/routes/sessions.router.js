import express from "express";
import { sessionsController } from "../controllers/sessions.controller.js";
import { optionalJwt } from "../middlewares/auth.js";
import { loginOnly } from "../middlewares/authChains.js";
import { mfaVerifyRateLimit } from "../middlewares/mfaRateLimit.js";

export const sessionsRouter = express.Router();

sessionsRouter.get("/me", optionalJwt, sessionsController.me);

sessionsRouter.post("/signup", sessionsController.signup);

sessionsRouter.post("/login", sessionsController.login);

sessionsRouter.post("/logout", sessionsController.logout);

sessionsRouter.post("/mfa/enroll", sessionsController.mfaEnroll);
sessionsRouter.post(
  "/mfa/verify",
  mfaVerifyRateLimit,
  sessionsController.mfaVerify
);
sessionsRouter.post("/mfa/disable", ...loginOnly, sessionsController.mfaDisable);
