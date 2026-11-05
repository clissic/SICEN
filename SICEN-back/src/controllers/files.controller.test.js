import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock de logger
vi.mock("../utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mocks de los directorios (usando paths inline para evitar hoisting issues)
vi.mock("../utils/avatarFiles.js", async () => {
  const p = await import("path");
  const { fileURLToPath } = await import("url");
  const dirname = p.dirname(fileURLToPath(import.meta.url));
  return {
    AVATARS_DIR: p.join(dirname, "../../test-uploads/avatars"),
  };
});

vi.mock("../utils/carFineProveFiles.js", async () => {
  const p = await import("path");
  const { fileURLToPath } = await import("url");
  const dirname = p.dirname(fileURLToPath(import.meta.url));
  return {
    CAR_FINE_PROVES_DIR: p.join(dirname, "../../test-uploads/carFineProves"),
  };
});

vi.mock("../utils/shipFineProveFiles.js", async () => {
  const p = await import("path");
  const { fileURLToPath } = await import("url");
  const dirname = p.dirname(fileURLToPath(import.meta.url));
  return {
    SHIP_FINE_PROVES_DIR: p.join(dirname, "../../test-uploads/shipFineProves"),
  };
});

vi.mock("../utils/personalFineProveFiles.js", async () => {
  const p = await import("path");
  const { fileURLToPath } = await import("url");
  const dirname = p.dirname(fileURLToPath(import.meta.url));
  return {
    PERSONAL_FINE_PROVES_DIR: p.join(dirname, "../../test-uploads/personalFineProves"),
  };
});

vi.mock("../utils/inspectionPDFFiles.js", async () => {
  const p = await import("path");
  const { fileURLToPath } = await import("url");
  const dirname = p.dirname(fileURLToPath(import.meta.url));
  return {
    INSPECTION_PDFS_DIR: p.join(dirname, "../../test-uploads/inspectionsERP"),
  };
});

import { getFile } from "./files.controller.js";

const TEST_BASE_DIR = path.join(__dirname, "../../test-uploads");
const TEST_AVATARS_DIR = path.join(TEST_BASE_DIR, "avatars");
const TEST_CAR_PROVES_DIR = path.join(TEST_BASE_DIR, "carFineProves");

describe("files.controller", () => {
  let req, res;

  beforeEach(async () => {
    // Crear directorios de prueba
    await fs.mkdir(TEST_AVATARS_DIR, { recursive: true });
    await fs.mkdir(TEST_CAR_PROVES_DIR, { recursive: true });

    // Crear archivo de prueba
    await fs.writeFile(
      path.join(TEST_AVATARS_DIR, "test-avatar.jpg"),
      "fake jpeg content"
    );

    req = {
      params: {},
      user: {
        _id: "user123",
        role: "admin",
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      sendFile: vi.fn((filePath, callback) => {
        // Simular éxito
        if (callback) callback(null);
      }),
      headersSent: false,
    };
  });

  afterEach(async () => {
    // Limpiar archivos de prueba
    await fs.rm(TEST_BASE_DIR, {
      recursive: true,
      force: true,
    });
    vi.clearAllMocks();
  });

  describe("getFile - autenticación", () => {
    it("debe rechazar tipo de archivo no válido", async () => {
      req.params = { type: "invalid", filename: "test.jpg" };
      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "Tipo de archivo no válido.",
      });
    });

    it("debe bloquear path traversal con ..", async () => {
      req.params = { type: "avatars", filename: "../../../etc/passwd" };
      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "Nombre de archivo no válido.",
      });
    });

    it("debe bloquear path traversal con /", async () => {
      req.params = { type: "avatars", filename: "subdir/test.jpg" };
      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "Nombre de archivo no válido.",
      });
    });

    it("debe bloquear caracteres especiales peligrosos", async () => {
      req.params = { type: "avatars", filename: "test;rm -rf.jpg" };
      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "Nombre de archivo no válido.",
      });
    });
  });

  describe("getFile - permisos por rol", () => {
    it("debe permitir a cualquier usuario autenticado acceder a avatars", async () => {
      req.params = { type: "avatars", filename: "test-avatar.jpg" };
      req.user.role = "skipper";

      await getFile(req, res);

      expect(res.type).toHaveBeenCalledWith("image/jpeg");
      expect(res.sendFile).toHaveBeenCalled();
    });

    it("debe denegar acceso a carFineProves sin rol autorizado", async () => {
      req.params = { type: "carFineProves", filename: "test.jpg" };
      req.user.role = "skipper";

      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "No tiene permisos para acceder a este tipo de archivo.",
      });
    });

    it("debe permitir a admin acceder a carFineProves", async () => {
      await fs.writeFile(
        path.join(TEST_CAR_PROVES_DIR, "test-prove.jpg"),
        "fake prove"
      );

      req.params = { type: "carFineProves", filename: "test-prove.jpg" };
      req.user.role = "admin";

      await getFile(req, res);

      expect(res.type).toHaveBeenCalledWith("image/jpeg");
      expect(res.sendFile).toHaveBeenCalled();
    });

    it("debe permitir a contable acceder a carFineProves", async () => {
      await fs.writeFile(
        path.join(TEST_CAR_PROVES_DIR, "test-prove.jpg"),
        "fake prove"
      );

      req.params = { type: "carFineProves", filename: "test-prove.jpg" };
      req.user.role = "contable";

      await getFile(req, res);

      expect(res.type).toHaveBeenCalledWith("image/jpeg");
      expect(res.sendFile).toHaveBeenCalled();
    });

    it("debe denegar acceso a shipFineProves sin rol admin", async () => {
      req.params = { type: "shipFineProves", filename: "test.jpg" };
      req.user.role = "contable";

      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "No tiene permisos para acceder a este tipo de archivo.",
      });
    });
  });

  describe("getFile - archivos no existentes", () => {
    it("debe devolver 404 si el archivo no existe", async () => {
      req.params = { type: "avatars", filename: "nonexistent.jpg" };
      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "Archivo no encontrado.",
      });
    });
  });

  describe("getFile - escape de directorios", () => {
    it("debe bloquear intentos de escape de directorio con path.resolve", async () => {
      // Crear archivo fuera del directorio permitido
      const outsideDir = path.join(TEST_BASE_DIR, "outside");
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(path.join(outsideDir, "secret.jpg"), "secret");

      // Intentar acceder con nombre que resuelva fuera del directorio
      req.params = { type: "avatars", filename: "..%2Foutside%2Fsecret.jpg" };
      await getFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: "Nombre de archivo no válido.",
      });
    });
  });
});
