import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { disableMfa, enrollMfa, verifyMfa } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { MfaCodeForm } from "../components/mfa/MfaCodeForm.jsx";
import { MfaEnrollPanel } from "../components/mfa/MfaEnrollPanel.jsx";
import { roleRequiresMfa } from "../constants/userRoles.js";

export function MfaSetupPage() {
  const { user, loading, refresh } = useAuth();
  const [enroll, setEnroll] = useState(null);
  const [currentCode, setCurrentCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [disableMode, setDisableMode] = useState(false);

  if (loading) {
    return (
      <Layout>
        <div className="container py-5 text-muted">Cargando…</div>
      </Layout>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roleRequiresMfa(user.role) && !user.mfaEnabled) {
    return <Navigate to="/home" replace />;
  }

  async function startEnroll(e) {
    e?.preventDefault?.();
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const data = await enrollMfa({
        currentCode: user.mfaEnabled ? currentCode : undefined,
      });
      setEnroll(data);
      setDisableMode(false);
    } catch (ex) {
      setErr(ex.message || "No se pudo generar el código QR.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(code) {
    setErr("");
    setBusy(true);
    try {
      const data = await verifyMfa({ code });
      setMsg(data.msg || "Verificación en dos pasos activada.");
      setEnroll(null);
      setCurrentCode("");
      await refresh();
    } catch (ex) {
      setErr(ex.message || "No se pudo activar la verificación.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(code) {
    setErr("");
    setBusy(true);
    try {
      const data = await disableMfa(code);
      setMsg(data.msg || "Verificación desactivada.");
      setDisableMode(false);
      await refresh();
    } catch (ex) {
      setErr(ex.message || "No se pudo desactivar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-7 col-xl-6">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                  <h3 className="m-0">Verificación en dos pasos</h3>
                  <Link className="btn btn-outline-secondary btn-sm" to="/home">
                    Volver
                  </Link>
                </div>

                {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
                {!enroll && !disableMode ? (
                  <ErrorAlert message={err} />
                ) : null}

                {enroll ? (
                  <MfaEnrollPanel
                    qrDataUrl={enroll.qrDataUrl}
                    secret={enroll.secret}
                    recoveryCodes={enroll.recoveryCodes}
                    onConfirm={confirmEnroll}
                    onBack={() => {
                      setEnroll(null);
                      setErr("");
                    }}
                    loading={busy}
                    error={err}
                  />
                ) : disableMode ? (
                  <MfaCodeForm
                    title="Desactivar verificación"
                    subtitle={
                      roleRequiresMfa(user.role)
                        ? "Ingresá el código de la app. En el próximo ingreso vas a tener que configurarla de nuevo."
                        : "Ingresá el código de la app o un código de recuperación."
                    }
                    submitLabel="Desactivar"
                    onSubmit={onDisable}
                    onBack={() => {
                      setDisableMode(false);
                      setErr("");
                    }}
                    loading={busy}
                    error={err}
                  />
                ) : (
                  <>
                    <p className="text-secondary">
                      {user.mfaEnabled
                        ? "La verificación en dos pasos está activa en esta cuenta."
                        : "Los administradores tienen que activar una app de autenticación para ingresar."}
                    </p>
                    {user.mfaEnabled ? (
                      <form onSubmit={startEnroll} className="vstack gap-3">
                        <div>
                          <label className="form-label" htmlFor="mfa-current">
                            Código actual para renovar el QR
                          </label>
                          <input
                            id="mfa-current"
                            className="form-control mfa-code-input"
                            value={currentCode}
                            onChange={(e) => setCurrentCode(e.target.value)}
                            placeholder="123456"
                            autoComplete="one-time-code"
                          />
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={busy}
                          >
                            Renovar configuración
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => {
                              setDisableMode(true);
                              setErr("");
                              setMsg("");
                            }}
                            disabled={busy}
                          >
                            Desactivar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={startEnroll}
                        disabled={busy}
                      >
                        {busy ? "Generando…" : "Configurar ahora"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
