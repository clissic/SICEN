import express from "express";
import { tokensController } from "../controllers/tokens.controller.js";
import { passwordRecoveryRateLimiter } from "../middlewares/rateLimiting.js";

export const tokensRouter = express.Router();

tokensRouter.post(
  "/recoverForm",
  passwordRecoveryRateLimiter,
  tokensController.recoverPass
);

tokensRouter.post(
  "/recoverPassword",
  passwordRecoveryRateLimiter,
  tokensController.recoverByEmail
);

tokensRouter.get("/recoverPassword", tokensController.recoverForm);