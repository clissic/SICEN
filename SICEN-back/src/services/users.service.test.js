import { describe, expect, it, vi, beforeEach } from "vitest";

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
    create: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../utils/emailTemplates.js", async () => {
  const actual = await vi.importActual("../utils/emailTemplates.js");
  return actual;
});

vi.mock("../utils/newUserPrefill.js", () => ({
  buildCreateUserFromRequestHref: vi.fn(() => "https://sicen.example.com/crear-usuario"),
}));

vi.mock("../utils/accountRequestReject.js", () => ({
  buildRejectAccountRequestHref: vi.fn(() => "https://sicen.example.com/rechazar-solicitud"),
}));

import { userService } from "./users.service.js";
import { transport } from "../utils/nodemailer.js";
import { usersModel } from "../DAO/models/users.model.js";

describe("userService - email functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendNewAccEmail", () => {
    it("envía email de solicitud de cuenta con formato correcto", async () => {
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
        accepted: ["sicen@example.com"],
      });

      await userService.sendNewAccEmail({
        first_name: "Juan",
        last_name: "Pérez",
        rank: "CN",
        unit: "PREMO",
        position: "Inspector",
        email: "juan.perez@example.com",
        newAccBody: "Solicito acceso para realizar inspecciones.",
        accountType: "pnn-funcionario",
        documentId: "12345678",
        birthDate: "1990-01-15",
      });

      expect(transport.sendMail).toHaveBeenCalled();
      const mailCall = transport.sendMail.mock.calls[0][0];

      expect(mailCall.from).toBe("sicen@example.com");
      expect(mailCall.to).toBe("sicen@example.com");
      expect(mailCall.subject).toContain("Solicitud de cuenta");
      expect(mailCall.html).toContain("Juan");
      expect(mailCall.html).toContain("Pérez");
      expect(mailCall.html).toContain("CN");
      expect(mailCall.html).toContain("PREMO");
      expect(mailCall.html).toContain("12345678");
      expect(mailCall.html).toContain("Solicito acceso para realizar inspecciones");
      expect(mailCall.html).toContain("Funcionario PNN");
      expect(mailCall.attachments).toBeDefined();
    });

    it("envía email de solicitud de cuenta náuta deportivo", async () => {
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
      });

      await userService.sendNewAccEmail({
        first_name: "María",
        last_name: "González",
        rank: "",
        unit: "",
        position: "099123456",
        email: "maria.gonzalez@example.com",
        newAccBody: "Necesito administrar mi embarcación.",
        accountType: "nauta-deportivo",
        documentId: "87654321",
        birthDate: "1985-06-20",
      });

      const mailCall = transport.sendMail.mock.calls[0][0];

      expect(mailCall.subject).toContain("Náuta deportivo");
      expect(mailCall.html).toContain("María");
      expect(mailCall.html).toContain("González");
      expect(mailCall.html).toContain("099123456");
      expect(mailCall.html).toContain("Náuta deportivo");
      expect(mailCall.html).toContain("Necesito administrar mi embarcación");
    });
  });

  describe("sendAccountRequestRejectedEmail", () => {
    it("envía email de rechazo de solicitud", async () => {
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
      });

      await userService.sendAccountRequestRejectedEmail({
        first_name: "Pedro",
        last_name: "Martínez",
        email: "pedro.martinez@example.com",
        typeLabel: "Náuta deportivo",
      });

      expect(transport.sendMail).toHaveBeenCalled();
      const mailCall = transport.sendMail.mock.calls[0][0];

      expect(mailCall.from).toBe("sicen@example.com");
      expect(mailCall.to).toBe("pedro.martinez@example.com");
      expect(mailCall.subject).toContain("no aprobada");
      expect(mailCall.html).toContain("Pedro");
      expect(mailCall.html).toContain("Martínez");
      expect(mailCall.html).toContain("Náuta deportivo");
      expect(mailCall.html).toContain("no fue aprobada");
    });
  });

  describe("sendNewDataEmail", () => {
    it("envía email de solicitud de actualización de datos", async () => {
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
      });

      await userService.sendNewDataEmail({
        first_name: "Carlos",
        last_name: "López",
        rank: "TN",
        unit: "PREMO",
        role: "user",
        email: "carlos.lopez@example.com",
        newFirstName: "Carlos Alberto",
        newLastName: "López García",
        newRank: "CN",
        newUnit: "PREGU",
        newRole: "admin",
        newEmail: "carlos.lopez.new@example.com",
        newDataBody: "Solicito actualizar mis datos por cambio de destino.",
        profilePhotoDataUrl: null,
        specializationRequests: [],
      });

      expect(transport.sendMail).toHaveBeenCalled();
      const mailCall = transport.sendMail.mock.calls[0][0];

      expect(mailCall.from).toBe("sicen@example.com");
      expect(mailCall.to).toBe("sicen@example.com");
      expect(mailCall.subject).toContain("actualización de datos");
      expect(mailCall.html).toContain("Carlos");
      expect(mailCall.html).toContain("López");
      expect(mailCall.html).toContain("Carlos Alberto");
      expect(mailCall.html).toContain("López García");
      expect(mailCall.html).toContain("CN");
      expect(mailCall.html).toContain("PREGU");
      expect(mailCall.html).toContain(
        "Solicito actualizar mis datos por cambio de destino"
      );
    });

    it("envía email con especializaciones solicitadas", async () => {
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
      });

      await userService.sendNewDataEmail({
        first_name: "Ana",
        last_name: "Silva",
        rank: "CF",
        unit: "PREMO",
        role: "user",
        email: "ana.silva@example.com",
        newFirstName: "Ana",
        newLastName: "Silva",
        newRank: "CF",
        newUnit: "PREMO",
        newRole: "user",
        newEmail: "ana.silva@example.com",
        newDataBody: "Solicito agregar especialización.",
        profilePhotoDataUrl: null,
        specializationRequests: [
          {
            name: "Navegación Astronómica",
            action: "Alta",
            certificateFileName: "certificado.pdf",
            certificateDataUrl:
              "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTE3IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTkyCiUlRU9G",
          },
        ],
      });

      const mailCall = transport.sendMail.mock.calls[0][0];

      expect(mailCall.html).toContain("Navegación Astronómica");
      expect(mailCall.html).toContain("Alta");
      expect(mailCall.attachments.length).toBeGreaterThan(0);
    });
  });

  describe("sendDataToNewUser", () => {
    it("envía email de bienvenida con credenciales", async () => {
      transport.sendMail.mockResolvedValue({
        messageId: "test-msg-id",
      });

      const result = await userService.sendDataToNewUser({
        first_name: "Roberto",
        last_name: "Fernández",
        rank: "TN",
        email: "roberto.fernandez@example.com",
      });

      expect(transport.sendMail).toHaveBeenCalled();
      const mailCall = transport.sendMail.mock.calls[0][0];

      expect(mailCall.from).toBe("sicen@example.com");
      expect(mailCall.to).toBe("roberto.fernandez@example.com");
      expect(mailCall.subject).toContain("Bienvenido");
      expect(mailCall.html).toContain("Roberto");
      expect(mailCall.html).toContain("Fernández");
      expect(mailCall.html).toContain("TN");
      expect(mailCall.html).toContain("roberto.fernandez@example.com");
      expect(mailCall.html).toContain("123456789");
      expect(mailCall.html).toContain("Ingresar a SICEN");
      expect(result).toBe(true);
    });
  });

  describe("isEmailInUse", () => {
    it("normaliza el email y verifica si está en uso", async () => {
      usersModel.findByEmail.mockResolvedValue({
        _id: "user123",
        email: "test@example.com",
      });

      const result = await userService.isEmailInUse("  Test@Example.COM  ");

      expect(usersModel.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toBe(true);
    });

    it("retorna false si el email no está en uso", async () => {
      usersModel.findByEmail.mockResolvedValue(null);

      const result = await userService.isEmailInUse("new@example.com");

      expect(result).toBe(false);
    });
  });

  describe("normalizeEmail", () => {
    it("normaliza el email correctamente", () => {
      expect(userService.normalizeEmail("  Test@Example.COM  ")).toBe(
        "test@example.com"
      );
      expect(userService.normalizeEmail("User@Domain.ORG")).toBe(
        "user@domain.org"
      );
      expect(userService.normalizeEmail("")).toBe("");
      expect(userService.normalizeEmail(null)).toBe("");
    });
  });
});
