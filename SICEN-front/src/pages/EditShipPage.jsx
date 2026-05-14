import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getVesselForEdit, updateVessel } from "../api/client.js";
import { ShipRegistrationForm } from "../components/ShipRegistrationForm.jsx";
import { Layout } from "../components/Layout.jsx";
import { INITIAL_SHIP_REGISTRATION_FORM } from "../constants/shipRegistrationFormDefaults.js";
import { scrollPageToTop } from "../utils/scrollPageToTop.js";
import {
  deportivoGrossTonnageCoherent,
  getShipRegistrationClientErr,
  parseGrossTonnageInput,
} from "../utils/shipRegistrationValidation.js";

export function EditShipPage() {
  const { vesselId: vesselIdParam } = useParams();
  const vesselId = String(vesselIdParam ?? "").trim();

  const [form, setForm] = useState(INITIAL_SHIP_REGISTRATION_FORM);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isDeportivo = form.vesselType === "Deportivo";

  const load = useCallback(async () => {
    if (!vesselId) {
      setLoadErr("Identificador de buque no válido.");
      setLoading(false);
      return;
    }
    setLoadErr("");
    setLoading(true);
    try {
      const data = await getVesselForEdit(vesselId);
      const f = data?.form;
      if (!f || typeof f !== "object") {
        setLoadErr("No se recibieron datos del buque.");
        setForm(INITIAL_SHIP_REGISTRATION_FORM);
        return;
      }
      setForm({ ...INITIAL_SHIP_REGISTRATION_FORM, ...f });
      setErr("");
      setMsg("");
    } catch (e) {
      setForm(INITIAL_SHIP_REGISTRATION_FORM);
      setLoadErr(e.message || e.data?.msg || "No se pudo cargar el buque.");
    } finally {
      setLoading(false);
    }
  }, [vesselId]);

  useEffect(() => {
    load();
  }, [load]);

  function setVesselType(v) {
    setForm((f) => {
      const next = { ...f, vesselType: v };
      const wasDeportivo = f.vesselType === "Deportivo";
      if (v === "Deportivo") {
        next.imoNumber = "";
        next.classificationKind = "";
        next.classificationSociety = "";
        next.classificationFlagRegistry = "";
        next.shipType = "";
        next.recreationalDocType = "";
        next.grossTonnage = "";
        next.netTonnage = "";
        next.deadweight = "";
      } else if (v === "Ultramar") {
        next.nationalRegistryNumber = "";
        next.recreationalDocType = "";
        next.grossTonnage = "";
        if (wasDeportivo) next.shipType = "";
      } else if (v === "Cabotaje") {
        next.recreationalDocType = "";
        next.grossTonnage = "";
        if (wasDeportivo) next.shipType = "";
      }
      if (v !== "Deportivo" && wasDeportivo) {
        next.puntal = "";
      }
      return next;
    });
  }

  function setRecreationalDocType(v) {
    setForm((f) => ({
      ...f,
      recreationalDocType: v,
    }));
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setClassificationKind(v) {
    setForm((f) => ({
      ...f,
      classificationKind: v,
      classificationSociety: "",
      classificationFlagRegistry: "",
    }));
  }

  const clientErr = useMemo(() => getShipRegistrationClientErr(form), [form]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (clientErr) {
      setErr(clientErr);
      scrollPageToTop();
      return;
    }
    if (isDeportivo && form.recreationalDocType) {
      const gt = parseGrossTonnageInput(form.grossTonnage);
      if (!Number.isFinite(gt)) {
        await Swal.fire({
          icon: "warning",
          title: "Arqueo bruto (GT)",
          text: "Indique un valor numérico válido para el arqueo bruto.",
          confirmButtonText: "Aceptar",
        });
        scrollPageToTop();
        return;
      }
      if (!deportivoGrossTonnageCoherent(gt, form.recreationalDocType)) {
        await Swal.fire({
          icon: "warning",
          title: "Arqueo bruto (GT)",
          text:
            "El número ingresado no es coherente con el tipo de registro seleccionado. Por favor corríjalo de acuerdo a los límites establecidos para dicho registro.",
          confirmButtonText: "Aceptar",
        });
        scrollPageToTop();
        return;
      }
    }
    setSubmitting(true);
    try {
      const data = await updateVessel(vesselId, form);
      setMsg(data?.msg || "Buque actualizado.");
      if (data?.form && typeof data.form === "object") {
        setForm({ ...INITIAL_SHIP_REGISTRATION_FORM, ...data.form });
      }
      scrollPageToTop();
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error al guardar el buque.");
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
            {loadErr ? (
              <div className="alert alert-danger py-2">{loadErr}</div>
            ) : null}
            {loading ? (
              <p className="text-muted small mb-0">Cargando datos del buque…</p>
            ) : !loadErr ? (
              <ShipRegistrationForm
                form={form}
                set={set}
                setVesselType={setVesselType}
                setRecreationalDocType={setRecreationalDocType}
                setClassificationKind={setClassificationKind}
                onSubmit={onSubmit}
                submitting={submitting}
                title="Modificar buque"
                subtitle="Revise los datos y pulse Modificar para guardar los cambios. Los certificados y demás módulos no se alteran desde aquí."
                cancelHref="/base-buques/editar"
                submitLabel="Modificar"
                submittingLabel="Guardando…"
                msg={msg}
                err={err}
                clientErr={clientErr}
              />
            ) : (
              <p className="mb-0">
                <Link to="/base-buques/editar">Volver a la búsqueda</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
