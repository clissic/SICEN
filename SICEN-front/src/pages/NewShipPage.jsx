import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { createVessel } from "../api/client.js";
import { INITIAL_SHIP_REGISTRATION_FORM, RECREATIONAL_CATEGORY_FIXED_CONSTRUCCION } from "../constants/shipRegistrationFormDefaults.js";
import { ShipRegistrationForm } from "../components/ShipRegistrationForm.jsx";
import { Layout } from "../components/Layout.jsx";
import { scrollPageToTop } from "../utils/scrollPageToTop.js";
import {
  deportivoGrossTonnageCoherent,
  getShipRegistrationClientErr,
  parseGrossTonnageInput,
} from "../utils/shipRegistrationValidation.js";

export function NewShipPage() {
  const [form, setForm] = useState(INITIAL_SHIP_REGISTRATION_FORM);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDeportivo = form.vesselType === "Deportivo";

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
        next.recreationalCategory = "";
        next.grossTonnage = "";
        next.netTonnage = "";
        next.deadweight = "";
      } else if (v === "Ultramar") {
        next.ownerSkipper = null;
        next.administratorSkippers = [];
        next.nationalRegistryNumber = "";
        next.recreationalDocType = "";
        next.recreationalCategory = "";
        next.grossTonnage = "";
        if (wasDeportivo) next.shipType = "";
      } else if (v === "Cabotaje") {
        next.ownerSkipper = null;
        next.administratorSkippers = [];
        next.recreationalDocType = "";
        next.recreationalCategory = "";
        next.grossTonnage = "";
        if (wasDeportivo) next.shipType = "";
      } else {
        next.ownerSkipper = null;
        next.administratorSkippers = [];
      }
      if (v !== "Deportivo" && wasDeportivo) {
        next.puntal = "";
      }
      return next;
    });
  }

  function setRecreationalDocType(v) {
    setForm((f) => {
      let recreationalCategory = f.recreationalCategory;
      if (v === "Extranjero") recreationalCategory = "";
      else if (v === "Certificado de Construcción") {
        recreationalCategory = RECREATIONAL_CATEGORY_FIXED_CONSTRUCCION;
      } else if (
        v === "Registro de Embarcaciones Deportivas" ||
        v === "Matrícula de Cabotaje"
      ) {
        recreationalCategory = "";
      } else if (!v) recreationalCategory = "";
      return { ...f, recreationalDocType: v, recreationalCategory };
    });
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
      const {
        ownerSkipper,
        administratorSkippers,
        ...rest
      } = form;
      const payload = {
        ...rest,
        ownerSkipperUserId: ownerSkipper?._id || "",
        administratorSkipperUserIds: (administratorSkippers || []).map(
          (a) => a._id
        ),
      };
      const data = await createVessel(payload);
      setMsg(data?.msg || "Buque registrado.");
      setForm(INITIAL_SHIP_REGISTRATION_FORM);
      scrollPageToTop();
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error al registrar el buque.");
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
            <ShipRegistrationForm
              form={form}
              set={set}
              setVesselType={setVesselType}
              setRecreationalDocType={setRecreationalDocType}
              setClassificationKind={setClassificationKind}
              onSubmit={onSubmit}
              submitting={submitting}
              title="Registrar nuevo buque"
              subtitle="Datos iniciales del registro. Certificados, inspecciones, PSC, embargos y seguimiento se cargan desde otros módulos."
              cancelHref="/base-buques"
              submitLabel="Registrar buque"
              submittingLabel="Guardando…"
              msg={msg}
              err={err}
              clientErr={clientErr}
              enableSkipperOwnershipLinking
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
