import { useState } from "react";
import { createSeafarer } from "../api/client.js";
import { SeafarerCreateForm } from "../components/SeafarerCreateForm.jsx";
import { Layout } from "../components/Layout.jsx";
import {
  INITIAL_SEAFARER_CREATE_FORM,
  seafarerCreateFormToPayload,
} from "../constants/seafarerCreateForm.js";
import { scrollPageToTop } from "../utils/scrollPageToTop.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientErr(form) {
  if (!String(form.documentType ?? "").trim()) {
    return "Seleccione el tipo de documento.";
  }
  if (!String(form.documentNumber ?? "").trim()) {
    return "Indique el número de documento.";
  }
  if (!String(form.firstName ?? "").trim()) return "Indique el nombre.";
  if (!String(form.lastName ?? "").trim()) return "Indique el apellido.";
  if (!String(form.birthDate ?? "").trim()) {
    return "Indique la fecha de nacimiento.";
  }
  if (!String(form.nationality ?? "").trim()) {
    return "Seleccione la nacionalidad.";
  }
  if (!String(form.gender ?? "").trim()) return "Seleccione el género.";
  if (!String(form.phone ?? "").trim()) return "Indique el teléfono.";
  if (!String(form.email ?? "").trim()) return "Indique el correo electrónico.";
  if (!EMAIL_RE.test(String(form.email).trim())) {
    return "El correo electrónico no es válido.";
  }
  return "";
}

export function NewSeafarerPage() {
  const [form, setForm] = useState(INITIAL_SEAFARER_CREATE_FORM);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const clientErr = getClientErr(form);
    if (clientErr) {
      setErr(clientErr);
      scrollPageToTop();
      return;
    }
    setSubmitting(true);
    try {
      const payload = seafarerCreateFormToPayload(form);
      const data = await createSeafarer(payload);
      setMsg(data?.msg || "Registro creado correctamente.");
      setForm(INITIAL_SEAFARER_CREATE_FORM);
      scrollPageToTop();
    } catch (ex) {
      setErr(
        ex.message || ex.data?.msg || "No se pudo crear el registro."
      );
      scrollPageToTop();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container-md py-4">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <SeafarerCreateForm
              form={form}
              set={set}
              onSubmit={onSubmit}
              submitting={submitting}
              msg={msg}
              err={err}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
