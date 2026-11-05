import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config/env.config.js", () => ({
  default: {
    googleEmail: "sicen@example.com",
    publicAppUrl: "https://sicen.example.com",
  },
}));

vi.mock("../utils/nodemailer.js", () => ({
  transport: {
    sendMail: vi.fn(),
  },
}));

vi.mock("../DAO/models/users.model.js", () => ({
  usersModel: {
    findByEmail: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

vi.mock("../DAO/models/tokens.model.js", () => ({
  recoverTokensModel: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../utils/random-code.js", () => ({
  generateRandomCode: vi.fn(() => "ABC123"),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { recoverTokensService } from "./tokens.service.js";
import { transport } from "../utils/nodemailer.js";
import { usersModel } from "../DAO/models/users.model.js";
import { recoverTokensModel } from "../DAO/models/tokens.model.js";

describe("recoverTokensService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendRecoveryToken", () => {
    it("envía email de recuperación con el formato correcto", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        first_name: "Test",
        last_name: "User",
      };

      usersModel.findByEmail.mockResolvedValue(mockUser);
      recoverTokensModel.create.mockResolvedValue({
        token: "ABC123",
        email: "user@example.com",
        expire: Date.now() + 3600000,
      });
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
        accepted: ["user@example.com"],
      });

      await recoverTokensService.sendRecoveryToken("user@example.com");

      expect(usersModel.findByEmail).toHaveBeenCalledWith("user@example.com");
      expect(recoverTokensModel.create).toHaveBeenCalled();
      expect(transport.sendMail).toHaveBeenCalled();

      const sendMailCall = transport.sendMail.mock.calls[0][0];
      expect(sendMailCall.from).toBe("sicen@example.com");
      expect(sendMailCall.to).toBe("user@example.com");
      expect(sendMailCall.subject).toContain("Recuperación de contraseña");
      expect(sendMailCall.html).toContain("ABC123");
      expect(sendMailCall.html).toContain("Restablecer contraseña");
      expect(sendMailCall.attachments).toBeDefined();
    });

    it("incluye el token y el enlace de recuperación en el email", async () => {
      const mockUser = {
        email: "test@example.com",
      };

      usersModel.findByEmail.mockResolvedValue(mockUser);
      recoverTokensModel.create.mockResolvedValue({
        token: "ABC123",
        email: "test@example.com",
        expire: Date.now() + 3600000,
      });
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
      });

      await recoverTokensService.sendRecoveryToken("test@example.com");

      const sendMailCall = transport.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain("ABC123");
      expect(sendMailCall.html).toContain(
        "https://sicen.example.com/restablecer"
      );
      expect(sendMailCall.html).toContain("token=ABC123");
      expect(sendMailCall.html).toContain("email=test%40example.com");
    });

    it("no envía email si el usuario no existe", async () => {
      usersModel.findByEmail.mockResolvedValue(null);

      await recoverTokensService.sendRecoveryToken("nonexistent@example.com");

      expect(transport.sendMail).not.toHaveBeenCalled();
    });

    it("crea el token con expiración de 1 hora", async () => {
      const mockUser = { email: "user@example.com" };
      const beforeTime = Date.now();

      usersModel.findByEmail.mockResolvedValue(mockUser);
      recoverTokensModel.create.mockResolvedValue({});
      transport.sendMail.mockResolvedValue({});

      await recoverTokensService.sendRecoveryToken("user@example.com");

      const createCall = recoverTokensModel.create.mock.calls[0][0];
      expect(createCall.token).toBe("ABC123");
      expect(createCall.email).toBe("user@example.com");
      expect(createCall.expire).toBeGreaterThan(beforeTime);
      expect(createCall.expire).toBeLessThanOrEqual(
        beforeTime + 3600000 + 100
      );
    });
  });

  describe("recoverPass", () => {
    it("actualiza la contraseña hasheada", async () => {
      usersModel.updatePassword.mockResolvedValue({ ok: true });

      await recoverTokensService.recoverPass(
        "user@example.com",
        "newPassword123"
      );

      expect(usersModel.updatePassword).toHaveBeenCalled();
      const updateCall = usersModel.updatePassword.mock.calls[0][0];
      expect(updateCall.email).toBe("user@example.com");
      expect(updateCall.password).toBeDefined();
      expect(updateCall.password).not.toBe("newPassword123");
    });
  });

  describe("create", () => {
    it("crea un token de recuperación", async () => {
      const tokenData = {
        token: "TEST123",
        email: "user@example.com",
        expire: Date.now() + 3600000,
      };

      recoverTokensModel.create.mockResolvedValue(tokenData);

      await recoverTokensService.create(tokenData);

      expect(recoverTokensModel.create).toHaveBeenCalledWith(tokenData);
    });
  });

  describe("findOne", () => {
    it("busca un token por email y código", async () => {
      const mockToken = {
        token: "ABC123",
        email: "user@example.com",
        expire: Date.now() + 3600000,
      };

      recoverTokensModel.findOne.mockResolvedValue(mockToken);

      const result = await recoverTokensService.findOne({
        token: "ABC123",
        email: "user@example.com",
      });

      expect(recoverTokensModel.findOne).toHaveBeenCalledWith({
        token: "ABC123",
        email: "user@example.com",
      });
      expect(result).toEqual(mockToken);
    });
  });
});
