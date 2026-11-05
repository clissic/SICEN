import { describe, expect, it } from "vitest";
import express from "express";

/**
 * Express 5 (path-to-regexp v8) exige wildcards con nombre y trata los
 * params de un segmento incluyendo el punto de la extensión.
 */
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

describe("GET /api/files/:type/:filename (Express 5)", () => {
  it("matchea filenames con extensión (.jpg, .pdf) y UUID", async () => {
    const app = express();
    app.get("/api/files/:type/:filename", (req, res) => {
      res.json({ type: req.params.type, filename: req.params.filename });
    });

    await withServer(app, async (port) => {
      const cases = [
        ["avatars", "test-avatar.jpg"],
        ["carFineProves", "550e8400-e29b-41d4-a716-446655440000.jpg"],
        ["inspectionsERP", "67a1b2c3d4e5f67890123456.pdf"],
      ];
      for (const [type, filename] of cases) {
        const res = await fetch(
          `http://127.0.0.1:${port}/api/files/${type}/${filename}`
        );
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ type, filename });
      }
    });
  });

  it("no usa wildcards sueltos: un splat sin nombre no se registra", () => {
    const app = express();
    expect(() => app.get("/api/files/*", () => {})).toThrow();
  });
});
