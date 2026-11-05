import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MfaCodeForm } from "./MfaCodeForm.jsx";

describe("MfaCodeForm", () => {
  it("envía un código TOTP de 6 dígitos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MfaCodeForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Código"), "123456");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onSubmit).toHaveBeenCalledWith("123456");
  });

  it("acepta un código de recuperación", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MfaCodeForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Código"), "abcd-ef01");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onSubmit).toHaveBeenCalledWith("ABCD-EF01");
  });

  it("no envía si el código es inválido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MfaCodeForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Código"), "12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Ingresá el código de 6 dígitos o un código de recuperación.")
    ).toBeTruthy();
  });
});
