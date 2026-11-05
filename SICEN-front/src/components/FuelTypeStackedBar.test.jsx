import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FuelTypeStackedBar } from "./FuelTypeStackedBar.jsx";

describe("FuelTypeStackedBar", () => {
  it("pone el porcentaje dentro del segmento y oculta los tramos chicos", () => {
    const { container } = render(
      <FuelTypeStackedBar
        items={[
          { key: "gasoil", label: "Gasoil", value: 80 },
          { key: "naftaSuper", label: "Nafta Súper", value: 15 },
          { key: "otros", label: "Otros", value: 5 },
        ]}
        formatValue={(n) => `${n} L`}
      />
    );
    expect(screen.getByText("80.0%")).toBeTruthy();
    expect(screen.getByText("15.0%")).toBeTruthy();
    expect(screen.queryByText("5.0%")).toBeNull();
    const compact = container.querySelector(".empre-fuel-mix__seg.is-compact");
    expect(compact).toBeTruthy();
    expect(compact.getAttribute("data-sicen-popover")).toContain("Otros");
    expect(compact.getAttribute("data-sicen-popover")).toContain("5.0%");
    expect(
      screen.getByRole("img", {
        name: /Consumo por tipo de combustible: Gasoil 80\.0%, Nafta Súper 15\.0%, Otros 5\.0%/,
      })
    ).toBeTruthy();
  });
});
