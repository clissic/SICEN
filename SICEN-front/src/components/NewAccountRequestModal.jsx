import { useEffect, useState } from "react";
import { newAccountRequest } from "../api/client.js";
import {
  NEW_ACCOUNT_TYPES,
  NEW_ACCOUNT_WIZARD_STEPS,
  isNautaAccountType,
  isPnnAccountType,
  newAccountTypeLabel,
} from "../constants/newAccountTypes.js";
import { RANK_OPTIONS } from "../constants/ranks.js";
import { UserUnitSelect } from "./UserUnitSelect.jsx";
import "../styles/new-account-request-modal.css";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  rank: "",
  unit: "",
  position: "",
  phone: "",
  documentId: "",
  birthDate: "",
  email: "",
  newAccBody: "",
};

/**
 * Wizard de solicitud de cuenta (3 pasos) desde el login.
 */
export function NewAccountRequestModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
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
      setAccountType("");
      setForm(EMPTY_FORM);
      setSubmitting(false);
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectAccountType(type) {
    if (!type.available) return;
    setAccountType(type.id);
    setStep(2);
  }

  function goBack() {
    if (step === 2) {
      setStep(1);
      setAccountType("");
      setResult(null);
      return;
    }
    if (step === 3 && result?.kind === "error") {
      setStep(2);
      setResult(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const typeLabel = newAccountTypeLabel(accountType);
      let payload;

      if (isPnnAccountType(accountType)) {
        payload = {
          accountType,
          first_name: form.first_name,
          last_name: form.last_name,
          rank: form.rank,
          unit: form.unit,
          position: form.position,
          email: form.email,
          newAccBody: form.newAccBody.trim(),
        };
      } else if (isNautaAccountType(accountType)) {
        payload = {
          accountType,
          first_name: form.first_name,
          last_name: form.last_name,
          rank: "Náuta deportivo",
          unit: "",
          position: form.phone.trim(),
          documentId: form.documentId.trim(),
          birthDate: form.birthDate,
          email: form.email,
          newAccBody: `[${typeLabel}]\n\n${form.newAccBody.trim()}`,
        };
      } else {
        payload = {
          accountType,
          first_name: form.first_name,
          last_name: form.last_name,
          rank: typeLabel,
          unit: form.unit,
          position: form.position,
          email: form.email,
          newAccBody: `[${typeLabel}]\n\n${form.newAccBody.trim()}`,
        };
      }

      const data = await newAccountRequest(payload);
      const emailShown = form.email.trim();
      setResult({
        kind: "success",
        message:
          data.msg ||
          "Su solicitud fue enviada correctamente.",
        email: emailShown,
      });
      setStep(3);
    } catch (ex) {
      setResult({
        kind: "error",
        message:
          ex.message ||
          ex.data?.msg ||
          "No pudimos enviar la solicitud. Revise los datos e intente de nuevo.",
      });
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitle =
    step === 1
      ? "Solicitar cuenta"
      : step === 2
        ? newAccountTypeLabel(accountType)
        : result?.kind === "success"
          ? "Solicitud enviada"
          : "No se pudo enviar";

  return (
    <>
      <div
        className="modal fade show d-block new-account-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-account-modal-title"
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
                  id="new-account-modal-title"
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
                aria-label="Pasos de la solicitud"
              >
                {NEW_ACCOUNT_WIZARD_STEPS.map((s) => {
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
              <div className="modal-body new-account-modal__body">
                <p className="new-account-modal__intro mb-0">
                  Elegí el tipo de cuenta que querés solicitar.
                </p>
                <div className="new-account-modal__type-list mt-3">
                  {NEW_ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className="new-account-modal__type-btn"
                      disabled={!type.available}
                      onClick={() => selectAccountType(type)}
                    >
                      <span className="new-account-modal__type-icon">
                        <i className={`bi ${type.icon}`} aria-hidden />
                      </span>
                      <span className="new-account-modal__type-copy">
                        <span className="new-account-modal__type-label">
                          {type.label}
                        </span>
                        <span className="new-account-modal__type-desc">
                          {type.description}
                        </span>
                      </span>
                      {!type.available ? (
                        <span className="badge text-bg-secondary new-account-modal__type-badge">
                          Próximamente
                        </span>
                      ) : (
                        <i
                          className="bi bi-chevron-right text-secondary"
                          aria-hidden
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <form
                onSubmit={onSubmit}
                className="d-flex flex-column"
                style={{ minHeight: 0, flex: 1 }}
              >
                <div className="modal-body new-account-modal__body">
                  <p className="new-account-modal__intro mb-3">
                    Completá sus datos. Le responderemos al correo indicado.
                  </p>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="new-acc-modal-first">
                        Nombre
                      </label>
                      <input
                        id="new-acc-modal-first"
                        className="form-control"
                        required
                        value={form.first_name}
                        onChange={(e) => setField("first_name", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="new-acc-modal-last">
                        Apellido
                      </label>
                      <input
                        id="new-acc-modal-last"
                        className="form-control"
                        required
                        value={form.last_name}
                        onChange={(e) => setField("last_name", e.target.value)}
                      />
                    </div>

                    {isPnnAccountType(accountType) ? (
                      <>
                        <div className="col-12 col-md-6">
                          <label
                            className="form-label"
                            htmlFor="new-acc-modal-rank"
                          >
                            Grado
                          </label>
                          <select
                            id="new-acc-modal-rank"
                            className="form-select"
                            required
                            value={form.rank}
                            onChange={(e) => setField("rank", e.target.value)}
                            aria-label="Grado"
                          >
                            <option value="">Seleccionar grado…</option>
                            {RANK_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-md-6">
                          <label
                            className="form-label"
                            htmlFor="new-acc-modal-unit"
                          >
                            Unidad
                          </label>
                          <UserUnitSelect
                            id="new-acc-modal-unit"
                            value={form.unit}
                            onChange={(v) => setField("unit", v)}
                            required
                            usePublicEndpoint
                            extraOptions={[
                              {
                                value: "OTRA",
                                label:
                                  "Otra — Aclarar en el cuerpo del mensaje",
                              },
                            ]}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label
                            className="form-label"
                            htmlFor="new-acc-modal-position"
                          >
                            Cargo que desempeña
                          </label>
                          <input
                            id="new-acc-modal-position"
                            className="form-control"
                            required
                            value={form.position}
                            onChange={(e) =>
                              setField("position", e.target.value)
                            }
                            placeholder="Ej.: Jefe de Unidad, Radio Operador…"
                          />
                        </div>
                      </>
                    ) : null}

                    {isNautaAccountType(accountType) ? (
                      <>
                        <div className="col-12 col-md-6">
                          <label
                            className="form-label"
                            htmlFor="new-acc-modal-document"
                          >
                            DNI / Pasaporte
                          </label>
                          <input
                            id="new-acc-modal-document"
                            className="form-control"
                            required
                            value={form.documentId}
                            onChange={(e) =>
                              setField("documentId", e.target.value)
                            }
                            placeholder="Ej.: 1.234.567-8"
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label
                            className="form-label"
                            htmlFor="new-acc-modal-birth"
                          >
                            Fecha de nacimiento
                          </label>
                          <input
                            id="new-acc-modal-birth"
                            className="form-control"
                            type="date"
                            required
                            value={form.birthDate}
                            onChange={(e) =>
                              setField("birthDate", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label
                            className="form-label"
                            htmlFor="new-acc-modal-phone"
                          >
                            Teléfono
                          </label>
                          <input
                            id="new-acc-modal-phone"
                            className="form-control"
                            type="tel"
                            required
                            value={form.phone}
                            onChange={(e) => setField("phone", e.target.value)}
                            placeholder="Ej.: 099 123 456"
                            autoComplete="tel"
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="new-acc-modal-email">
                        Email
                      </label>
                      <input
                        id="new-acc-modal-email"
                        className="form-control"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder={
                          isPnnAccountType(accountType)
                            ? "Ej.: napellido@armada.mil.uy"
                            : "Ej.: nombre@correo.com"
                        }
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="new-acc-modal-body">
                        Mensaje / motivo
                      </label>
                      <textarea
                        id="new-acc-modal-body"
                        className="form-control"
                        rows={4}
                        required
                        value={form.newAccBody}
                        onChange={(e) => setField("newAccBody", e.target.value)}
                        placeholder={
                          isNautaAccountType(accountType)
                            ? "Indicá brevet, matrícula u otro dato útil para la solicitud…"
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer new-account-modal__footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={goBack}
                    disabled={submitting}
                  >
                    Atrás
                  </button>
                  <div className="new-account-modal__footer-actions">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={onClose}
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
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
                        "Enviar solicitud"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}

            {step === 3 ? (
              <>
                <div className="modal-body new-account-modal__body">
                  <div className="new-account-modal__result">
                    <i
                      className={`bi ${
                        result?.kind === "success"
                          ? "bi-check-circle-fill"
                          : "bi-exclamation-circle-fill"
                      } new-account-modal__result-icon ${
                        result?.kind === "success" ? "is-success" : "is-error"
                      }`}
                      aria-hidden
                    />
                    <h3 className="new-account-modal__result-title">
                      {result?.kind === "success"
                        ? "Solicitud registrada"
                        : "No se pudo completar"}
                    </h3>
                    {result?.kind === "success" ? (
                      <div className="new-account-modal__result-text">
                        <p className="mb-2">
                          Su solicitud fue enviada correctamente.
                        </p>
                        <p className="mb-2">
                          Un administrador del sistema revisará la solicitud y
                          evaluará el acceso. El resultado se le informará a
                          través del email ingresado
                          {result.email ? (
                            <>
                              {" "}
                              (<strong>{result.email}</strong>)
                            </>
                          ) : null}
                          .
                        </p>
                        <p className="mb-0 text-secondary">
                          Este proceso puede demorar; no es necesario volver a
                          enviar la misma solicitud.
                        </p>
                      </div>
                    ) : (
                      <p className="new-account-modal__result-text">
                        {result?.message}
                      </p>
                    )}
                  </div>
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
    </>
  );
}
