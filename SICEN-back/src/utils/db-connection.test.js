import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env.config.js", () => ({
  default: {
    mongoUri: "",
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

  it("acepta mongodb+srv", () => {
    const uri =
      "mongodb+srv://user:pass@cluster.mongodb.net/SIGMU_DB?retryWrites=true";
    expect(resolveMongoUri(uri)).toBe(uri);
  });
});
