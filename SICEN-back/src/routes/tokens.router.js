import express from "express";
import { tokensController } from "../controllers/tokens.controller.js";

export const tokensRouter = express.Router();

tokensRouter.post("/recoverForm", tokensController.recoverPass);

tokensRouter.post("/recoverPassword", tokensController.recoverByEmail);

tokensRouter.get("/recoverPassword", tokensController.recoverForm);