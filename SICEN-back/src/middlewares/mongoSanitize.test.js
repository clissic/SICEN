import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({
  logger: {
    warning: vi.fn(),
  },
}));

import { logger } from "../utils/logger.js";
import {
  mongoSanitizeMiddleware,
  sanitizeObjectInPlace,
} from "./mongoSanitize.js";

describe("sanitizeObjectInPlace", () => {
  it("reemplaza $ y . en claves por _", () => {
    const body = { $gt: 1, "user.name": "ana", ok: true };
    sanitizeObjectInPlace(body);
    expect(body.$gt).toBeUndefined();
    expect(body._gt).toBe(1);
    expect(body["user.name"]).toBeUndefined();
    expect(body["user_name"]).toBe("ana");
    expect(body.ok).toBe(true);
  });

  it("recorre objetos anidados y arrays", () => {
    const body = {
      filter: { $ne: null },
      items: [{ $in: ["a"] }],
    };
    sanitizeObjectInPlace(body);
    expect(body.filter.$ne).toBeUndefined();
    expect(body.filter._ne).toBeNull();
    expect(body.items[0].$in).toBeUndefined();
    expect(body.items[0]._in).toEqual(["a"]);
  });

  it("no camina Date ni Buffer", () => {
    const date = new Date("2024-01-01");
    const buf = Buffer.from("x");
    const body = { when: date, file: buf };
    sanitizeObjectInPlace(body);
    expect(body.when).toBe(date);
    expect(body.file).toBe(buf);
  });
});

describe("mongoSanitizeMiddleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      ip: "127.0.0.1",
      body: { name: "ok" },
      params: { id: "1" },
      query: { q: "x" },
    };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("sanitiza body, params y query in-place", () => {
    req.body = { $where: "1" };
    req.params = { "id.eq": "2" };
    req.query = { $gt: "3" };

    mongoSanitizeMiddleware(req, res, next);

    expect(req.body.$where).toBeUndefined();
    expect(req.body._where).toBe("1");
    expect(req.params["id.eq"]).toBeUndefined();
    expect(req.params.id_eq).toBe("2");
    expect(req.query.$gt).toBeUndefined();
    expect(req.query._gt).toBe("3");
    expect(next).toHaveBeenCalledOnce();
    expect(logger.warning).toHaveBeenCalled();
  });

  it("no asigna req.query (compatible con getter de Express 5)", () => {
    const parsed = { $ne: "1", keep: "yes" };
    const reqWithGetter = {
      ip: "10.0.0.1",
      body: {},
      params: {},
    };
    Object.defineProperty(reqWithGetter, "query", {
      configurable: true,
      enumerable: true,
      get() {
        return parsed;
      },
      set() {
        throw new TypeError("Cannot set property query of #<IncomingMessage>");
      },
    });

    expect(() =>
      mongoSanitizeMiddleware(reqWithGetter, res, next)
    ).not.toThrow();

    expect(reqWithGetter.query.$ne).toBeUndefined();
    expect(reqWithGetter.query._ne).toBe("1");
    expect(reqWithGetter.query.keep).toBe("yes");
    expect(next).toHaveBeenCalledOnce();
  });

  it("no llama next con error si body/query están vacíos", () => {
    req.body = undefined;
    req.params = undefined;
    req.query = undefined;
    mongoSanitizeMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
