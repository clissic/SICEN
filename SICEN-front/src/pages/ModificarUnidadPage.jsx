import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getUnit, listUnitsRegistered, updateUnit } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import {
  UnitJurisdictionPortsFields,
  appendPortsUnderJurisdiction,
} from "../components/UnitJurisdictionPortsFields.jsx";

const ESCUDO_PRENA = "/img/ESCUDO-UNIDADES-PNN/PRENA.png";

function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function portsFromUnit(unit) {
  const list = Array.isArray(unit?.portsUnderJurisdiction)
    ? unit.portsUnderJurisdiction.map((p) => String(p || ""))
    : [];
  return list.length ? list : [""];
}

export function ModificarUnidadPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedAcronym, setSelectedAcronym] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ports, setPorts] = useState([""]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listUnitsRegistered();
        if (!cancelled) {
          setUnits(data.units ?? []);
        }
      } catch {
        if (!cancelled) setUnits([]);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onChangeSigla(e) {
    const ac = e.target.value;
    setSelectedAcronym(ac);
    setDetail(null);
    setPorts([""]);
    if (!ac) return;
    setDetailLoading(true);
    try {
      const data = await getUnit(ac);
      const unit = data.unit ?? null;
      setDetail(unit);
      setPorts(portsFromUnit(unit));
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo cargar",
        text: err?.message || "Error del servidor.",
      });
      setDetail(null);
      setPorts([""]);
    } finally {
      setDetailLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedAcronym || !detail) return;

    const fd = new FormData(e.target);
    const escudo = fd.get("escudo");
    if (!escudo || typeof escudo !== "object" || escudo.size === 0) {
      fd.delete("escudo");
    }
    appendPortsUnderJurisdiction(fd, ports);

    setSubmitting(true);
    try {
      const data = await updateUnit(selectedAcronym, fd);
      await Swal.fire({
        icon: "success",
        title: "Unidad actualizada",
        text: data.msg || "Los cambios se guardaron correctamente.",
        confirmButtonText: "Aceptar",
      });
      navigate("/gestion-unidades");
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: err?.message || "Error del servidor.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container-md py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Modificar unidad</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/gestion-unidades"
          >
            Volver a gestión de unidades
          </Link>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <label className="form-label mb-2" htmlFor="mu-sigla-select">
              Unidad a editar <span className="text-danger">*</span>
            </label>
            <select
              id="mu-sigla-select"
              className="form-select"
              value={selectedAcronym}
              onChange={onChangeSigla}
              disabled={listLoading}
            >
              <option value="">
                {listLoading ? "Cargando unidades…" : "Seleccione una unidad…"}
              </option>
              {units.map((u) => (
                <option key={u.acronym} value={u.acronym}>
                  {u.acronym} — {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {detailLoading ? (
          <p className="text-muted">Cargando datos…</p>
        ) : detail ? (
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <img
                  src={detail.shieldRelativeUrl?.trim() || ESCUDO_PRENA}
                  alt=""
                  className="object-fit-contain flex-shrink-0"
                  style={{ maxHeight: "4rem", maxWidth: "5rem" }}
                  loading="lazy"
                  onError={(ev) => {
                    const el = ev.currentTarget;
                    if (
                      el.src.endsWith("/PRENA.png") ||
                      el.src.endsWith("PRENA.png")
                    ) {
                      return;
                    }
                    el.src = ESCUDO_PRENA;
                  }}
                />
                <p className="text-muted small mb-0">
                  Escudo actual (el archivo PNG usa la sigla; si la cambia, se
                  renombra en el servidor).
                </p>
              </div>

              <form key={detail.acronym} onSubmit={onSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-nombre">
                      Nombre <span className="text-danger">*</span>
                    </label>
                    <input
                      id="mu-nombre"
                      name="nombre"
                      type="text"
                      className="form-control"
                      required
                      maxLength={200}
                      defaultValue={detail.name}
                      autoComplete="organization"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-sigla">
                      Sigla <span className="text-danger">*</span>
                    </label>
                    <input
                      id="mu-sigla"
                      name="sigla"
                      type="text"
                      className="form-control text-uppercase"
                      required
                      minLength={4}
                      maxLength={6}
                      pattern="[A-Za-z0-9]{4,6}"
                      data-sicen-popover="4 a 6 caracteres alfanuméricos"
                      onInvalid={(e) => {
                        e.currentTarget.setCustomValidity(
                          "4 a 6 caracteres alfanuméricos"
                        );
                      }}
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                      defaultValue={detail.acronym}
                      autoComplete="off"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="mu-dir">
                      Dirección
                    </label>
                    <input
                      id="mu-dir"
                      name="direccion"
                      type="text"
                      className="form-control"
                      maxLength={500}
                      defaultValue={detail.address ?? ""}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-tel">
                      Teléfono
                    </label>
                    <input
                      id="mu-tel"
                      name="telefono"
                      type="text"
                      className="form-control"
                      maxLength={50}
                      defaultValue={detail.phone ?? ""}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-fecha">
                      Fecha de creación <span className="text-danger">*</span>
                    </label>
                    <input
                      id="mu-fecha"
                      name="fechaCreacion"
                      type="date"
                      className="form-control"
                      required
                      defaultValue={isoToDateInput(detail.foundationDate)}
                    />
                  </div>

                  <UnitJurisdictionPortsFields
                    ports={ports}
                    onChange={setPorts}
                    disabled={submitting}
                    idPrefix="mu-port"
                  />

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-eradio">
                      Email Sala de Radio
                    </label>
                    <input
                      id="mu-eradio"
                      name="emailRadio"
                      type="email"
                      className="form-control"
                      maxLength={120}
                      defaultValue={detail.emailRadio ?? ""}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-epm">
                      Email Policía Marítima
                    </label>
                    <input
                      id="mu-epm"
                      name="emailPoliciaMaritima"
                      type="email"
                      className="form-control"
                      maxLength={120}
                      defaultValue={detail.emailPoliciaMaritima ?? ""}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-emm">
                      Email Marina Mercante
                    </label>
                    <input
                      id="mu-emm"
                      name="emailMarinaMercante"
                      type="email"
                      className="form-control"
                      maxLength={120}
                      defaultValue={detail.emailMarinaMercante ?? ""}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="mu-eal">
                      Email Apoyo Logístico
                    </label>
                    <input
                      id="mu-eal"
                      name="emailApoyoLogistico"
                      type="email"
                      className="form-control"
                      maxLength={120}
                      defaultValue={detail.emailApoyoLogistico ?? ""}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="mu-esec">
                      Email Secretaría
                    </label>
                    <input
                      id="mu-esec"
                      name="emailSecretaria"
                      type="email"
                      className="form-control"
                      maxLength={120}
                      defaultValue={detail.emailSecretaria ?? ""}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="mu-her">
                      Heráldica
                    </label>
                    <textarea
                      id="mu-her"
                      name="heraldica"
                      className="form-control"
                      rows={5}
                      maxLength={20000}
                      defaultValue={detail.heraldica ?? ""}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="mu-escudo">
                      Nueva imagen del escudo (PNG)
                    </label>
                    <input
                      id="mu-escudo"
                      name="escudo"
                      type="file"
                      className="form-control"
                      accept=".png,image/png"
                    />
                    <div className="form-text">
                      Opcional. Si no adjunta archivo, se conserva el escudo
                      actual.
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Guardando…" : "Guardar cambios"}
                  </button>
                  <Link
                    className="btn btn-outline-secondary"
                    to="/gestion-unidades"
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            </div>
          </div>
        ) : selectedAcronym ? null : (
          <p className="text-muted mb-0">
            Elija una unidad en el listado para ver y editar sus datos.
          </p>
        )}
      </div>
    </Layout>
  );
}
