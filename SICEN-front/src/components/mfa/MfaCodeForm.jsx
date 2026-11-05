import { useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import { isRecoveryCode, isTotpCode, normalizeMfaCode } from "../../utils/mfa.js";

export function MfaCodeForm({
  onSubmit,
  onBack,
  loading = false,
  error = "",
  title = "Verificación en dos pasos",
  subtitle = "Ingresá el código de 6 dígitos de la app de autenticación. Si no tenés el teléfono, usá un código de recuperación.",
  submitLabel = "Continuar",
  allowRecovery = true,
}) {
  const [code, setCode] = useState("");
  const [localErr, setLocalErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalErr("");
    const trimmed = code.trim();
    if (!isTotpCode(trimmed) && !(allowRecovery && isRecoveryCode(trimmed))) {
      setLocalErr(
        allowRecovery
          ? "Ingresá el código de 6 dígitos o un código de recuperación."
          : "Ingresá el código de 6 dígitos."
      );
      return;
    }
    await onSubmit(trimmed);
  }

  return (
    <div className="mfa-panel">
      <h2 className="login-panel__title">{title}</h2>
      <p className="login-panel__subtitle">{subtitle}</p>
      <ErrorAlert
        message={localErr || error}
        className="alert alert-danger py-2 mb-3"
      />
      <form onSubmit={handleSubmit} className="vstack gap-3">
        <div>
          <label className="form-label" htmlFor="mfa-code">
            Código
          </label>
          <input
            id="mfa-code"
            className="form-control mfa-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            spellCheck={false}
            required
            value={code}
            onChange={(e) => setCode(normalizeMfaCode(e.target.value))}
            placeholder={allowRecovery ? "123456 o ABCD-EF01" : "123456"}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
        >
          {loading ? "Verificando…" : submitLabel}
        </button>
        {onBack ? (
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={onBack}
            disabled={loading}
          >
            Volver
          </button>
        ) : null}
      </form>
    </div>
  );
}
