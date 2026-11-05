import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";

vi.mock("../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../middlewares/authChains.js", () => ({
  guarded: [
    (req, res, next) => {
      if (!String(req.headers.authorization || "").startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, msg: "Debe iniciar sesión." });
      }
      req.user = {
        email: "empre@pnn.gub.uy",
        unit: "EMPRE",
        role: "user",
      };
      next();
    },
  ],
}));

vi.mock("../services/borderPatrols.service.js", () => ({
  listBorderPatrolsByMonth: vi.fn(),
  createBorderPatrol: vi.fn(),
  updateBorderPatrolStatus: vi.fn(),
  deleteBorderPatrol: vi.fn(),
}));

vi.mock("../services/borderPatrolTypes.service.js", () => ({
  listBorderPatrolTypes: vi.fn(),
  createBorderPatrolType: vi.fn(),
  updateBorderPatrolType: vi.fn(),
  deleteBorderPatrolType: vi.fn(),
}));

import { mongoSanitizeMiddleware } from "../middlewares/mongoSanitize.js";
import { borderPatrolsRouter } from "./borderPatrols.router.js";
import { borderPatrolTypesRouter } from "./borderPatrolTypes.router.js";
import {
  createBorderPatrol,
  deleteBorderPatrol,
  listBorderPatrolsByMonth,
  updateBorderPatrolStatus,
} from "../services/borderPatrols.service.js";
import {
  createBorderPatrolType,
  listBorderPatrolTypes,
} from "../services/borderPatrolTypes.service.js";

const PATROL_ID = "507f191e810c19729de860ea";
const TYPE_ID = "507f1f77bcf86cd799439011";
const AUTH = { Authorization: "Bearer test-token" };

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

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(mongoSanitizeMiddleware);
  app.use("/api/borderPatrols", borderPatrolsRouter);
  app.use("/api/borderPatrolTypes", borderPatrolTypesRouter);
  return app;
}

describe("routers borderPatrols / borderPatrolTypes (Express 5 + guarded)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/borderPatrols sin JWT responde 401", async () => {
    await withServer(makeApp(), async (port) => {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrols?year=2026&month=3`
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ ok: false });
      expect(listBorderPatrolsByMonth).not.toHaveBeenCalled();
    });
  });

  it("GET /api/borderPatrols lista el mes con query sanitizada", async () => {
    listBorderPatrolsByMonth.mockResolvedValue([
      { _id: PATROL_ID, date: "2026-03-02" },
    ]);

    await withServer(makeApp(), async (port) => {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrols?year=2026&month=3&$gt=1`,
        { headers: AUTH }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        ok: true,
        patrols: [{ _id: PATROL_ID, date: "2026-03-02" }],
      });
      expect(listBorderPatrolsByMonth).toHaveBeenCalledWith(
        expect.objectContaining({ year: "2026", month: "3" }),
        expect.objectContaining({ unit: "EMPRE" })
      );
      const query = listBorderPatrolsByMonth.mock.calls[0][0];
      expect(query).not.toHaveProperty("$gt");
      expect(query).toHaveProperty("_gt", "1");
    });
  });

  it("POST /api/borderPatrols crea y responde 201", async () => {
    createBorderPatrol.mockResolvedValue({
      _id: PATROL_ID,
      status: "planned",
    });

    await withServer(makeApp(), async (port) => {
      const res = await fetch(`http://127.0.0.1:${port}/api/borderPatrols`, {
        method: "POST",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({
          unitAcronym: "PRENA",
          typeId: TYPE_ID,
          kind: "fluvial",
          date: "2026-03-02",
        }),
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        ok: true,
        patrol: { _id: PATROL_ID },
      });
    });
  });

  it("PATCH /api/borderPatrols/:id matchea ObjectId (Express 5)", async () => {
    updateBorderPatrolStatus.mockResolvedValue({
      _id: PATROL_ID,
      status: "missed",
    });

    await withServer(makeApp(), async (port) => {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrols/${PATROL_ID}`,
        {
          method: "PATCH",
          headers: { ...AUTH, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "missed" }),
        }
      );
      expect(res.status).toBe(200);
      expect(updateBorderPatrolStatus).toHaveBeenCalledWith(
        PATROL_ID,
        { status: "missed" },
        expect.objectContaining({ unit: "EMPRE" })
      );
    });
  });

  it("DELETE /api/borderPatrols/:id", async () => {
    deleteBorderPatrol.mockResolvedValue({ _id: PATROL_ID });

    await withServer(makeApp(), async (port) => {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrols/${PATROL_ID}`,
        { method: "DELETE", headers: AUTH }
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        ok: true,
        deletedId: PATROL_ID,
      });
    });
  });

  it("GET /api/borderPatrolTypes exige login y pasa unitAcronym", async () => {
    listBorderPatrolTypes.mockResolvedValue([{ number: 1, kind: "fluvial" }]);

    await withServer(makeApp(), async (port) => {
      const anon = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrolTypes?unitAcronym=PRENA`
      );
      expect(anon.status).toBe(401);

      const res = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrolTypes?unitAcronym=PRENA`,
        { headers: AUTH }
      );
      expect(res.status).toBe(200);
      expect(listBorderPatrolTypes).toHaveBeenCalledWith(
        "PRENA",
        expect.objectContaining({ unit: "EMPRE" })
      );
    });
  });

  it("POST /api/borderPatrolTypes crea el catálogo de la unidad", async () => {
    createBorderPatrolType.mockResolvedValue({
      _id: TYPE_ID,
      number: 1,
      kind: "terrestre",
    });

    await withServer(makeApp(), async (port) => {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/borderPatrolTypes`,
        {
          method: "POST",
          headers: { ...AUTH, "Content-Type": "application/json" },
          body: JSON.stringify({
            number: 1,
            kind: "terrestre",
            detail: "Ruta 1",
            area: "rio-uruguay",
          }),
        }
      );
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ ok: true, type: { _id: TYPE_ID } });
    });
  });

  it("no registra wildcards Express 4 sueltos", () => {
    const app = express();
    expect(() => app.get("/api/borderPatrols/*", () => {})).toThrow();
  });
});
