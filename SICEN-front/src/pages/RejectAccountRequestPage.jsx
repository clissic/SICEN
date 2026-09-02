import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  previewRejectAccountRequest,
  rejectAccountRequest,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

/**
 * Confirma el rechazo de una solicitud de cuenta (enlace del correo admin).
 */
export function RejectAccountRequestPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      setRequest(null);
      if (!token) {
        setErr("Falta el enlace de rechazo en la dirección.");
        setLoading(false);
        return;
      }
      try {
        const data = await previewRejectAccountRequest(token);
        if (cancelled) return;
        if (!data?.ok || !data.request) {
          setErr(data?.msg || "No se pudo validar el enlace.");
          return;
        }
        setRequest(data.request);
      } catch (ex) {
        if (cancelled) return;
        setErr(
          ex.message ||
            ex.data?.msg ||
            "No se pudo validar el enlace de rechazo."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onConfirm() {
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      const data = await rejectAccountRequest(token);
      setMsg(
        data.msg ||
          "Se informó al solicitante que la solicitud no fue aprobada."
      );
    } catch (ex) {
      setErr(
        ex.message ||
          ex.data?.msg ||
          "No se pudo enviar el aviso de rechazo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container-md py-5">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Rechazar solicitud de cuenta</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/usuarios">
            Volver
          </Link>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            {loading ? (
              <p className="text-muted mb-0">Validando enlace…</p>
            ) : null}

            <ErrorAlert message={err} />

            {msg ? (
              <div className="alert alert-success py-2 mb-0" role="status">
                {msg}
              </div>
            ) : null}

            {!loading && request && !msg ? (
              <>
                <p className="mb-3">
                  Se enviará un correo al solicitante informando que{" "}
                  <strong>no se aprobó</strong> la creación de la cuenta.
                </p>
                <dl className="row mb-4 small">
                  <dt className="col-sm-3">Tipo</dt>
                  <dd className="col-sm-9">{request.typeLabel || "—"}</dd>
                  <dt className="col-sm-3">Nombre</dt>
                  <dd className="col-sm-9">
                    {[request.first_name, request.last_name]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </dd>
                  <dt className="col-sm-3">Email</dt>
                  <dd className="col-sm-9">{request.email || "—"}</dd>
                </dl>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={onConfirm}
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? "Enviando…" : "Confirmar rechazo"}
                  </button>
                  <Link className="btn btn-outline-secondary" to="/usuarios">
                    Cancelar
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
