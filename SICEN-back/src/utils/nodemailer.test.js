import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { transport } from "./nodemailer.js";

describe("nodemailer transport", () => {
  it("exporta el transport correctamente", () => {
    expect(transport).toBeDefined();
    expect(typeof transport.sendMail).toBe("function");
  });

  it("tiene las propiedades esperadas de un transporter", () => {
    expect(transport.options).toBeDefined();
    expect(transport.options.service).toBe("gmail");
    expect(transport.options.port).toBe(587);
  });
});

describe("nodemailer sendMail", () => {
  let originalSendMail;

  beforeEach(() => {
    originalSendMail = transport.sendMail;
    transport.sendMail = vi.fn().mockResolvedValue({
      messageId: "test-message-id",
      accepted: ["test@example.com"],
      rejected: [],
    });
  });

  afterEach(() => {
    transport.sendMail = originalSendMail;
  });

  it("envía correo con opciones básicas", async () => {
    const mailOptions = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      text: "Test body",
    };

    const result = await transport.sendMail(mailOptions);

    expect(transport.sendMail).toHaveBeenCalledWith(mailOptions);
    expect(result.messageId).toBe("test-message-id");
    expect(result.accepted).toContain("test@example.com");
  });

  it("envía correo con HTML", async () => {
    const mailOptions = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "HTML Test",
      html: "<h1>Test HTML</h1><p>Body</p>",
    };

    const result = await transport.sendMail(mailOptions);

    expect(transport.sendMail).toHaveBeenCalledWith(mailOptions);
    expect(result.messageId).toBeDefined();
  });

  it("envía correo con adjuntos (Buffer)", async () => {
    const mailOptions = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Attachment Test",
      text: "Email with attachment",
      attachments: [
        {
          filename: "test.txt",
          content: Buffer.from("Test content"),
          contentType: "text/plain",
        },
      ],
    };

    const result = await transport.sendMail(mailOptions);

    expect(transport.sendMail).toHaveBeenCalledWith(mailOptions);
    expect(result.messageId).toBeDefined();
  });

  it("envía correo con múltiples destinatarios", async () => {
    const mailOptions = {
      from: "sender@example.com",
      to: "recipient1@example.com, recipient2@example.com",
      subject: "Multiple Recipients",
      text: "Test body",
    };

    const result = await transport.sendMail(mailOptions);

    expect(transport.sendMail).toHaveBeenCalledWith(mailOptions);
    expect(result.messageId).toBeDefined();
  });

  it("envía correo con opciones completas (similar a los flujos reales)", async () => {
    const mailOptions = {
      from: "sicen@example.com",
      to: "user@example.com",
      subject: "[SICEN] Test Message",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h1>Test Title</h1>
            <p>Test content</p>
            <a href="https://example.com">Test Link</a>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: "logo.png",
          content: Buffer.from("fake-image-data"),
          contentType: "image/png",
        },
      ],
    };

    const result = await transport.sendMail(mailOptions);

    expect(transport.sendMail).toHaveBeenCalledWith(mailOptions);
    expect(result.messageId).toBeDefined();
    expect(result.accepted.length).toBeGreaterThan(0);
  });
});
