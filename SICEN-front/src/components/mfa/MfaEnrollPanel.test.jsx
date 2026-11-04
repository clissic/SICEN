import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MfaEnrollPanel } from "./MfaEnrollPanel.jsx";

const props = {
  qrDataUrl: "data:image/png;base64,QQ",
  secret: "JBSWY3DPEHPK3PXP",
  recoveryCodes: ["ABCD-EF01", "1111-2222"],
};

describe("MfaEnrollPanel", () => {
  it("muestra el QR, la clave y los códigos de recuperación", () => {
    render(<MfaEnrollPanel {...props} onConfirm={vi.fn()} />);
    expect(screen.getByAltText("Código QR para la app de autenticación")).toBeTruthy();
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeTruthy();
    expect(screen.getByText("ABCD-EF01")).toBeTruthy();
  });

  it("exige guardar los códigos antes de activar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<MfaEnrollPanel {...props} onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText("Código de 6 dígitos"), "123456");
    await user.click(screen.getByRole("button", { name: "Activar y continuar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText("Confirmá que guardaste los códigos de recuperación.")
    ).toBeTruthy();
  });

  it("confirma con el TOTP si ya se marcaron los códigos", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<MfaEnrollPanel {...props} onConfirm={onConfirm} />);
    await user.click(screen.getByLabelText("Ya guardé los códigos de recuperación"));
    await user.type(screen.getByLabelText("Código de 6 dígitos"), "654321");
    await user.click(screen.getByRole("button", { name: "Activar y continuar" }));
    expect(onConfirm).toHaveBeenCalledWith("654321");
  });
});
