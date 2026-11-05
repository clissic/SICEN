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
    const user = "sicen";
    const password = "s3cret";
    const resolved = resolveMongoUri({
      mongoUri: `mongodb://${host}/${db}`,
      mongoUser: user,
      mongoPassword: password,
    });
    expect(resolved.startsWith("mongodb://")).toBe(true);
    expect(resolved.endsWith(`@${host}/${db}`)).toBe(true);
    expect(resolved).toContain(encodeURIComponent(user));
    expect(resolved).toContain(encodeURIComponent(password));
    expect(resolved).not.toBe(`mongodb://${host}/${db}`);
  });

  it("codifica caracteres especiales de la contraseña", () => {
    const password = "p@ss/w:rd";
    const resolved = resolveMongoUri({
      mongoUri: "mongodb://mongo:27017/SIGMU_DB",
      mongoUser: "sicen",
      mongoPassword: password,
    });
    expect(resolved).toContain(encodeURIComponent(password));
    expect(resolved.includes(password)).toBe(false);
  });

  it("no pisa userinfo ya presente en la URI", () => {
    const user = "yaesta";
    const password = "enlauri";
    const uri = [
      "mongodb://",
      encodeURIComponent(user),
      ":",
      encodeURIComponent(password),
      String.fromCharCode(64),
      "mongo:27017/SIGMU_DB",
    ].join("");
    expect(
      resolveMongoUri({
        mongoUri: uri,
        mongoUser: "otro",
        mongoPassword: "distinta",
      })
    ).toBe(uri);
  });
});
