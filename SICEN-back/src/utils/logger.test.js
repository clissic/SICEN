import { describe, it, expect } from "vitest";
import { logger, parseBoolEnv, shouldLogToFile } from "./logger.js";

describe("logger", () => {
  it("expone warning y el alias warn (niveles custom solo definen warning)", () => {
    expect(typeof logger.warning).toBe("function");
    expect(typeof logger.warn).toBe("function");
  });
});

describe("parseBoolEnv", () => {
  it("acepta true/false y vacíos", () => {
    expect(parseBoolEnv("true")).toBe(true);
    expect(parseBoolEnv("1")).toBe(true);
    expect(parseBoolEnv("yes")).toBe(true);
    expect(parseBoolEnv("false")).toBe(false);
    expect(parseBoolEnv("0")).toBe(false);
    expect(parseBoolEnv("no")).toBe(false);
    expect(parseBoolEnv("")).toBeUndefined();
    expect(parseBoolEnv(undefined)).toBeUndefined();
  });
});

describe("shouldLogToFile", () => {
  it("respeta LOG_TO_FILE explícito aunque esté en Docker", () => {
    expect(
      shouldLogToFile({ logToFile: "false", loggerEnv: "production", docker: true })
    ).toBe(false);
    expect(
      shouldLogToFile({ logToFile: "true", loggerEnv: "development", docker: true })
    ).toBe(true);
  });

  it("en Docker sin flag usa consola", () => {
    expect(
      shouldLogToFile({ logToFile: "", loggerEnv: "production", docker: true })
    ).toBe(false);
  });

  it("en producción local sin flag usa archivo", () => {
    expect(
      shouldLogToFile({
        logToFile: undefined,
        loggerEnv: "production",
        docker: false,
      })
    ).toBe(true);
  });

  it("en development local sin flag usa consola", () => {
    expect(
      shouldLogToFile({
        logToFile: undefined,
        loggerEnv: "development",
        docker: false,
      })
    ).toBe(false);
  });
});
