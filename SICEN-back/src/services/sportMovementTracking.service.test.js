import { describe, expect, it } from "vitest";
import { userCanViewMovementTracking } from "../services/sportMovementTrackingBridge.service.js";

describe("userCanViewMovementTracking", () => {
  const movement = {
    originUnit: "PREMO",
    destinationUnit: "PRENA",
    informedUnits: ["PREGU"],
  };

  it("permite unidad origen", () => {
    expect(
      userCanViewMovementTracking(movement, { unit: "PREMO", role: "user" })
    ).toBe(true);
  });

  it("permite unidad destino", () => {
    expect(
      userCanViewMovementTracking(movement, { unit: "PRENA", role: "user" })
    ).toBe(true);
  });

  it("permite unidad en tránsito", () => {
    expect(
      userCanViewMovementTracking(movement, { unit: "PREGU", role: "user" })
    ).toBe(true);
  });

  it("rechaza unidad ajena", () => {
    expect(
      userCanViewMovementTracking(movement, { unit: "PRECO", role: "user" })
    ).toBe(false);
  });

  it("permite náuta con flag de buque gestionado", () => {
    expect(
      userCanViewMovementTracking(
        { ...movement, _skipperCanView: true },
        { role: "skipper" }
      )
    ).toBe(true);
  });
});
