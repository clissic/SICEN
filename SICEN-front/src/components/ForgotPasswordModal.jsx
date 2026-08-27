import { useEffect, useState } from "react";
import { forgotPassword } from "../api/client.js";
import { ErrorAlert } from "./ErrorAlert.jsx";
import "../styles/new-account-request-modal.css";

const FORGOT_PASSWORD_STEPS = [
  { id: 1, label: "Email" },
  { id: 2, label: "Confirmación" },
];

/**
 * Wizard de recuperación de contraseña (2 pasos) desde el login.
 */
export function ForgotPasswordModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setEmail("");
      setSubmitting(false);
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  function goBack() {
    if (step === 2 && result?.kind === "error") {
      setStep(1);
      setResult(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      await forgotPassword(email);
      setResult({
        kind: "success",
        message:
          "Enviamos un enlace a su correo para restablecer la contraseña. Si no lo ve en la bandeja de entrada, intente revisando el correo no deseado.",
      });
      setStep(2);
    } catch (ex) {
      setResult({
        kind: "error",
        message:
          ex.message ||
          ex.data?.msg ||
          "No pudimos enviar el enlace. Revise el email e intente de nuevo.",
      });
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitle =
    step === 1
      ? "Recuperar contraseña"
      : result?.kind === "success"
        ? "Enlace enviado"
        : "No se pudo enviar";

  return (
    <div
      className="modal fade show d-block new-account-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-modal-title"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered new-account-modal__dialog my-3">
        <div className="modal-content new-account-modal__content">
          <div className="modal-header new-account-modal__header">
            <div className="new-account-modal__header-top">
              <h2
                className="new-account-modal__title"
                id="forgot-password-modal-title"
              >
                {stepTitle}
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
                disabled={submitting}
              />
            </div>
            <ol
              className="new-account-modal__steps"
              aria-label="Pasos de recuperación"
            >
              {FORGOT_PASSWORD_STEPS.map((s) => {
                const isActive = step === s.id;
                const isComplete = step > s.id;
                return (
                  <li
                    key={s.id}
                    className={[
                      "new-account-modal__step",
                      isActive ? "is-active" : "",
                      isComplete ? "is-complete" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className="new-account-modal__step-badge">
                      {isComplete ? (
                        <i className="bi bi-check-lg" aria-hidden />
                      ) : (
                        s.id
                      )}
                    </span>
                    <span className="new-account-modal__step-label">
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {step === 1 ? (
            <form
              onSubmit={onSubmit}
              className="d-flex flex-column"
              style={{ minHeight: 0, flex: 1 }}
            >
              <div className="modal-body new-account-modal__body">
                <p className="new-account-modal__intro mb-3">
                  Ingrese el email de su cuenta. Le enviaremos un enlace para
                  restablecer la contraseña.
                </p>
                <div>
                  <label className="form-label" htmlFor="forgot-password-email">
                    Email
                  </label>
                  <input
                    id="forgot-password-email"
                    className="form-control"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer new-account-modal__footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <div className="new-account-modal__footer-actions">
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-2"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden
                          style={{
                            width: "1em",
                            height: "1em",
                            borderWidth: "0.15em",
                          }}
                        />
                        Enviando…
                      </>
                    ) : (
                      "Enviar enlace"
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <>
              <div className="modal-body new-account-modal__body">
                {result?.kind === "success" ? (
                  <div className="new-account-modal__result">
                    <i
                      className="bi bi-envelope-check-fill new-account-modal__result-icon is-success"
                      aria-hidden
                    />
                    <h3 className="new-account-modal__result-title">
                      Revise su correo
                    </h3>
                    <p className="new-account-modal__result-text">
                      {result.message}
                    </p>
                    {email ? (
                      <p className="new-account-modal__result-text mt-2 mb-0">
                        <strong>{email}</strong>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="new-account-modal__result">
                      <i
                        className="bi bi-exclamation-circle-fill new-account-modal__result-icon is-error"
                        aria-hidden
                      />
                      <h3 className="new-account-modal__result-title">
                        No se pudo enviar
                      </h3>
                    </div>
                    <ErrorAlert
                      message={result?.message}
                      className="alert alert-danger py-2 small mb-0"
                    />
                  </>
                )}
              </div>
              <div className="modal-footer new-account-modal__footer">
                {result?.kind === "error" ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={goBack}
                  >
                    Reintentar
                  </button>
                ) : null}
                <div className="new-account-modal__footer-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onClose}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
