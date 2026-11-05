import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({
  logger: {
    warning: vi.fn(),
  },
}));

import { rejectBrotliMiddleware } from "./rejectBrotli.js";

describe("rejectBrotliMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: vi.fn(),
      ip: "127.0.0.1",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("rechaza Content-Encoding: br (Brotli)", () => {
    req.get.mockReturnValue("br");

    rejectBrotliMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      msg: "Content-Encoding no soportado.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rechaza Content-Encoding desconocido", () => {
    req.get.mockReturnValue("unknown-encoding");

    rejectBrotliMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      msg: "Content-Encoding no soportado.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("permite gzip", () => {
    req.get.mockReturnValue("gzip");

    rejectBrotliMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("permite deflate", () => {
    req.get.mockReturnValue("deflate");

    rejectBrotliMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("permite identity", () => {
    req.get.mockReturnValue("identity");

    rejectBrotliMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("permite sin Content-Encoding (undefined)", () => {
    req.get.mockReturnValue(undefined);

    rejectBrotliMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("permite Content-Encoding vacío", () => {
    req.get.mockReturnValue("");

    rejectBrotliMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rechaza br con case insensitive (BR, Br)", () => {
    req.get.mockReturnValue("BR");
    rejectBrotliMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(next).not.toHaveBeenCalled();

    vi.clearAllMocks();

    req.get.mockReturnValue("Br");
    rejectBrotliMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(next).not.toHaveBeenCalled();
  });

  it("rechaza br con espacios (trim)", () => {
    req.get.mockReturnValue(" br ");

    rejectBrotliMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(next).not.toHaveBeenCalled();
  });
});
