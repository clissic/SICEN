import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

// Mock de logger antes de importar el módulo bajo test
vi.mock("./logger.js", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  validateFileType,
  validateJpeg,
  validatePdf,
  validateImage,
  validateDocument,
} from "./fileValidation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FILES_DIR = path.join(__dirname, "../../test-files-validation");

describe("fileValidation", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_FILES_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_FILES_DIR, { recursive: true, force: true });
  });

  describe("validateJpeg", () => {
    it("debe rechazar un archivo de texto con extensión .jpg", async () => {
      const filePath = path.join(TEST_FILES_DIR, "fake.jpg");
      await fs.writeFile(filePath, "This is not a JPEG file");

      const result = await validateJpeg(filePath);
      expect(result).toBe(false);
    });

    it("debe rechazar un archivo PNG con extensión .jpg", async () => {
      const filePath = path.join(TEST_FILES_DIR, "fake-png.jpg");
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await fs.writeFile(filePath, pngHeader);

      const result = await validateJpeg(filePath);
      expect(result).toBe(false);
    });

    it("debe aceptar un archivo JPEG real", async () => {
      const filePath = path.join(TEST_FILES_DIR, "real.jpg");
      // JPEG magic bytes: FF D8 FF
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);
      await fs.writeFile(filePath, jpegHeader);

      const result = await validateJpeg(filePath);
      expect(result).toBe(true);
    });
  });

  describe("validatePdf", () => {
    it("debe rechazar un archivo de texto con extensión .pdf", async () => {
      const filePath = path.join(TEST_FILES_DIR, "fake.pdf");
      await fs.writeFile(filePath, "This is not a PDF file");

      const result = await validatePdf(filePath);
      expect(result).toBe(false);
    });

    it("debe aceptar un archivo PDF real", async () => {
      const filePath = path.join(TEST_FILES_DIR, "real.pdf");
      // PDF magic bytes: %PDF-
      const pdfHeader = Buffer.from("%PDF-1.4\n");
      await fs.writeFile(filePath, pdfHeader);

      const result = await validatePdf(filePath);
      expect(result).toBe(true);
    });

    it("debe rechazar un ejecutable con extensión .pdf", async () => {
      const filePath = path.join(TEST_FILES_DIR, "malicious.pdf");
      // EXE magic bytes: MZ
      const exeHeader = Buffer.from("MZ");
      await fs.writeFile(filePath, exeHeader);

      const result = await validatePdf(filePath);
      expect(result).toBe(false);
    });
  });

  describe("validateImage", () => {
    it("debe aceptar JPEG", async () => {
      const filePath = path.join(TEST_FILES_DIR, "image.jpg");
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      await fs.writeFile(filePath, jpegHeader);

      const result = await validateImage(filePath);
      expect(result).toBe(true);
    });

    it("debe aceptar PNG", async () => {
      const filePath = path.join(TEST_FILES_DIR, "image.png");
      // PNG magic bytes con IHDR chunk mínimo para que file-type lo reconozca
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, // IHDR length (13 bytes)
        0x49, 0x48, 0x44, 0x52, // "IHDR"
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
        0x90, 0x77, 0x53, 0xde, // CRC
      ]);
      await fs.writeFile(filePath, pngData);

      const result = await validateImage(filePath);
      expect(result).toBe(true);
    });

    it("debe rechazar un PDF", async () => {
      const filePath = path.join(TEST_FILES_DIR, "document.pdf");
      const pdfHeader = Buffer.from("%PDF-1.4");
      await fs.writeFile(filePath, pdfHeader);

      const result = await validateImage(filePath);
      expect(result).toBe(false);
    });
  });

  describe("validateDocument", () => {
    it("debe aceptar un PDF", async () => {
      const filePath = path.join(TEST_FILES_DIR, "doc.pdf");
      const pdfHeader = Buffer.from("%PDF-1.4");
      await fs.writeFile(filePath, pdfHeader);

      const result = await validateDocument(filePath);
      expect(result).toBe(true);
    });

    it("debe rechazar una imagen", async () => {
      const filePath = path.join(TEST_FILES_DIR, "image.jpg");
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      await fs.writeFile(filePath, jpegHeader);

      const result = await validateDocument(filePath);
      expect(result).toBe(false);
    });
  });

  describe("validateFileType - casos límite", () => {
    it("debe rechazar archivo vacío", async () => {
      const filePath = path.join(TEST_FILES_DIR, "empty.jpg");
      await fs.writeFile(filePath, "");

      const result = await validateJpeg(filePath);
      expect(result).toBe(false);
    });

    it("debe rechazar archivo con solo unos pocos bytes", async () => {
      const filePath = path.join(TEST_FILES_DIR, "short.jpg");
      await fs.writeFile(filePath, Buffer.from([0xff, 0xd8]));

      const result = await validateJpeg(filePath);
      // file-type puede o no detectarlo, pero es demasiado corto para ser válido
      expect(result).toBe(false);
    });
  });
});
