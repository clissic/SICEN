import { Router } from "express";
import { checkLogin } from "../middlewares/auth.js";
import { getFile } from "../controllers/files.controller.js";

export const filesRouter = Router();

/**
 * GET /api/files/:type/:filename
 * Sirve archivos con autenticación JWT y control de permisos por tipo.
 * 
 * Tipos soportados:
 * - avatars: avatares de usuarios (requiere login)
 * - carFineProves: pruebas de multas vehiculares (admin/contable)
 * - shipFineProves: pruebas de multas marítimas (admin)
 * - personalFineProves: pruebas de multas personales (admin)
 * - inspectionsERP: PDFs de inspecciones (admin/observador)
 */
filesRouter.get("/:type/:filename", checkLogin, getFile);
