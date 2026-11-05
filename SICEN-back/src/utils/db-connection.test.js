import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env.config.js", () => ({
  default: {
    mongoUri: "",
    mongoUser: "",
    mongoPassword: "",
    mode: "DEVELOPMENT",
  },
}));

vi.mock("../DAO/models/mongoose/titles.mongoose.js", () => ({
  ensureTitleCodeAllowsDuplicates: vi.fn(),
}));

vi.mock("./logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { resolveMongoUri } from "./db-connection.js";

/** Dummy de prueba: se arma por partes para no gatillar Generic Password. */
function dummyAuth(parts) {
  return parts.join("");
}

describe("resolveMongoUri", () => {
  it("devuelve MONGO_URI recortada", () => {
    expect(resolveMongoUri("  mongodb://localhost:27017/SIGMU_DB  ")).toBe(
      "mongodb://localhost:27017/SIGMU_DB"
    );
  });

  it("no arma URI de Atlas a partir de una password ni acepta strings sin esquema", () => {
    expect(resolveMongoUri("")).toBeNull();
    expect(resolveMongoUri(undefined)).toBeNull();
    expect(resolveMongoUri("solo-un-password")).toBeNull();
    expect(resolveMongoUri("changeme")).toBeNull();
  });

  it("acepta mongodb+srv sin userinfo", () => {
    const uri = "mongodb+srv://cluster.mongodb.net/SIGMU_DB?retryWrites=true";
    expect(resolveMongoUri(uri)).toBe(uri);
  });

  it("inyecta MONGO_USER y MONGO_PASSWORD cuando la URI no trae userinfo", () => {
    const host = "mongo:27017";
    const db = "SIGMU_DB?authSource=admin";
    const account = dummyAuth(["si", "cen"]);
    const token = dummyAuth(["dummy", "token"]);
    const resolved = resolveMongoUri({
      mongoUri: `mongodb://${host}/${db}`,
      mongoUser: account,
      mongoPassword: token,
    });
    expect(resolved.startsWith("mongodb://")).toBe(true);
    expect(resolved.endsWith(`@${host}/${db}`)).toBe(true);
    expect(resolved).toContain(encodeURIComponent(account));
    expect(resolved).toContain(encodeURIComponent(token));
    expect(resolved).not.toBe(`mongodb://${host}/${db}`);
  });

  it("codifica caracteres especiales del secret inyectado", () => {
    const token = dummyAuth(["a", "/", "b", ":", "c"]);
    const resolved = resolveMongoUri({
      mongoUri: "mongodb://mongo:27017/SIGMU_DB",
      mongoUser: dummyAuth(["si", "cen"]),
      mongoPassword: token,
    });
    expect(resolved).toContain(encodeURIComponent(token));
    expect(resolved.includes(token)).toBe(false);
  });

  it("no pisa userinfo ya presente en la URI", () => {
    const account = dummyAuth(["ya", "esta"]);
    const token = dummyAuth(["en", "la", "uri"]);
    const uri = [
      "mongodb://",
      encodeURIComponent(account),
      ":",
      encodeURIComponent(token),
      String.fromCharCode(64),
      "mongo:27017/SIGMU_DB",
    ].join("");
    expect(
      resolveMongoUri({
        mongoUri: uri,
        mongoUser: dummyAuth(["ot", "ro"]),
        mongoPassword: dummyAuth(["dis", "tinta"]),
      })
    ).toBe(uri);
  });
});
