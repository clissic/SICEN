import { describe, expect, it } from "vitest";
import express from "express";
import { securityHeaders } from "./securityHeaders.js";

async function withServer(app, run) {
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  });
  try {
    const { port } = server.address();
    return await run(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("securityHeaders CSP para /api/files", () => {
  it("permite blob: en img-src y frame-src, y deja object-src en none", async () => {
    const app = express();
    app.use(securityHeaders);
    app.get("/ping", (_req, res) => res.send("ok"));

    await withServer(app, async (port) => {
      const res = await fetch(`http://127.0.0.1:${port}/ping`);
      const csp = res.headers.get("content-security-policy") || "";

      expect(csp).toMatch(/img-src[^;]*blob:/);
      expect(csp).toMatch(/img-src[^;]*'self'/);
      expect(csp).toMatch(/frame-src[^;]*'self'/);
      expect(csp).toMatch(/frame-src[^;]*blob:/);
      expect(csp).toMatch(/object-src 'none'/);
      expect(csp).toMatch(/connect-src[^;]*'self'/);
    });
  });
});
