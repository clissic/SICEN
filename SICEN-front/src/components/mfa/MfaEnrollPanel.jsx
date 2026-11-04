import { useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import { formatRecoveryCode, isTotpCode } from "../../utils/mfa.js";

export function MfaEnrollPanel({
  qrDataUrl,
  secret,
  recoveryCodes = [],
  onConfirm,
  onBack,
  loading = false,
  error = "",
}) {
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");
  const [localErr, setLocalErr] = useState("");

  async function copyText(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalErr("");
    if (!saved) {
      setLocalErr("Confirmá que guardaste los códigos de recuperación.");
      return;
    }
    if (!isTotpCode(code)) {
      setLocalErr("Ingresá el código de 6 dígitos que muestra la app.");
      return;
    }
    await onConfirm(code.trim());
  }

  return (
    <div className="mfa-panel">
      <h2 className="login-panel__title">Configurar verificación en dos pasos</h2>
      <p className="login-panel__subtitle">
        Escaneá el código QR con una app de autenticación (Google Authenticator,
        Authy u otra). Si no podés escanear, ingresá la clave a mano.
      </p>
      <ErrorAlert
        message={localErr || error}
        className="alert alert-danger py-2 mb-3"
      />

      <div className="mfa-enroll-layout">
        {qrDataUrl ? (
          <div className="mfa-qr" aria-hidden={!qrDataUrl}>
            <img
              src={qrDataUrl}
              alt="Código QR para la app de autenticación"
              width="256"
              height="256"
            />
          </div>
        ) : null}

        <div className="mfa-secret-block">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
            <span className="form-label mb-0">Clave manual</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => copyText("secret", secret)}
            >
              {copied === "secret" ? "Copiada" : "Copiar"}
            </button>
          </div>
          <code className="mfa-secret">{secret}</code>
        </div>
      </div>

      <div className="mfa-recovery mt-3">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <h3 className="h6 mb-0">Códigos de recuperación</h3>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              copyText("recovery", recoveryCodes.map(formatRecoveryCode).join("\n"))
            }
          >
            {copied === "recovery" ? "Copiados" : "Copiar todos"}
          </button>
        </div>
        <p className="small text-secondary mb-2">
          Guardalos en un lugar seguro. Cada uno se usa una sola vez si no tenés
          el teléfono.
        </p>
        <ul className="mfa-recovery-list">
          {recoveryCodes.map((c) => (
            <li key={c}>
              <code>{formatRecoveryCode(c)}</code>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="vstack gap-3 mt-3">
        <div className="form-check">
          <input
            id="mfa-saved"
            className="form-check-input"
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="mfa-saved">
            Ya guardé los códigos de recuperación
          </label>
        </div>
        <div>
          <label className="form-label" htmlFor="mfa-enroll-code">
            Código de 6 dígitos
          </label>
          <input
            id="mfa-enroll-code"
            className="form-control mfa-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
        >
          {loading ? "Activando…" : "Activar y continuar"}
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
