import { describe, it, expect } from "vitest";
import { logger } from "./logger.js";

describe("logger", () => {
  it("expone warning y el alias warn (niveles custom solo definen warning)", () => {
    expect(typeof logger.warning).toBe("function");
    expect(typeof logger.warn).toBe("function");
  });
});
