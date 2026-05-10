import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { getUnit, listUnitsRegistered } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function escapeHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function cell(label, value) {
  const raw =
    value === undefined || value === null ? "" : String(value).trim();
  const display = raw !== "" ? escapeHtml(raw) : "—";
  return `<div class="sicen-unit-cell mb-1"><div class="sicen-unit-cell__label">${escapeHtml(label)}</div><div class="sicen-unit-cell__value text-break">${display}</div></div>`;
}

function buildUnitDetailHtml(unit) {
  const shieldSrc = unit.shieldRelativeUrl
    ? escapeHtml(unit.shieldRelativeUrl)
    : "/img/avatar.png";

  const emailsRows = [
    ["Sala de Radio", unit.emailRadio],
    ["Policía Marítima", unit.emailPoliciaMaritima],
    ["Marina Mercante", unit.emailMarinaMercante],
    ["Apoyo Logístico", unit.emailApoyoLogistico],
    ["Secretaría", unit.emailSecretaria],
  ]
    .map(
      ([lbl, val]) =>
        `<div class="col-sm-6">${cell(`Email ${lbl}`, val)}</div>`
    )
    .join("");

  const heraldRaw = unit.heraldica?.trim?.() ? unit.heraldica : "";
  const heraldBlock = heraldRaw
    ? `<div class="sicen-unit-section"><div class="sicen-unit-section__title">Heráldica</div><div class="sicen-unit-herald border rounded-2 px-2 py-2 small text-break">${escapeHtml(heraldRaw)}</div></div>`
    : `<div class="sicen-unit-section">${cell("Heráldica", "")}</div>`;

  return `
<style>
.sicen-unit-modal{font-size:0.875rem;line-height:1.35;margin:0;padding:0}
.sicen-unit-head{display:flex;gap:0.75rem;align-items:flex-start;margin:0 0 0.65rem;padding:0 0 0.65rem;border-bottom:1px solid var(--bs-border-color-translucent,#dee2e6)}
.sicen-unit-head img{width:4rem;height:4rem;object-fit:contain;border:none;background:transparent;padding:0}
.sicen-unit-head__meta{min-width:0;flex:1}
.sicen-unit-head__name{font-weight:600;font-size:0.95rem;line-height:1.2;margin:0 0 0.1rem}
.sicen-unit-head__acr{color:#6c757d;font-size:0.78rem;margin:0}
.sicen-unit-cell__label{color:#6c757d;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.08rem;line-height:1.15}
.sicen-unit-cell__value{font-weight:500;font-size:0.84rem;margin:0}
.sicen-unit-section{border-top:1px solid var(--bs-border-color-translucent,#dee2e6);margin-top:0.45rem;padding-top:0.45rem}
.sicen-unit-section__title{color:#6c757d;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.3rem;font-weight:600}
.sicen-unit-herald{white-space:pre-wrap;max-height:10rem;overflow-y:auto;line-height:1.35;background:#f8f9fa;border-color:#e9ecef!important}
</style>
<div class="sicen-unit-modal">
  <div class="sicen-unit-head">
    <img src="${shieldSrc}" alt="" />
    <div class="sicen-unit-head__meta">
      <p class="sicen-unit-head__name">${escapeHtml(unit.name)}</p>
      <p class="sicen-unit-head__acr">Sigla ${escapeHtml(unit.acronym)}</p>
    </div>
  </div>
  <div class="row g-1 gx-2 gy-0">
    <div class="col-12">${cell("Dirección", unit.address)}</div>
    <div class="col-sm-6">${cell("Teléfono", unit.phone)}</div>
    <div class="col-sm-6">${cell("Fecha de creación", formatDate(unit.foundationDate))}</div>
  </div>
  <div class="sicen-unit-section">
    <div class="sicen-unit-section__title">Correos electrónicos</div>
    <div class="row g-1 gx-2">${emailsRows}</div>
  </div>
  ${heraldBlock}
</div>`;
}

async function openUnitDetailModal(acronym) {
  try {
    Swal.fire({
      title: "Cargando…",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    const data = await getUnit(acronym);
    const unit = data.unit;
    if (!unit) {
      await Swal.fire({
        icon: "warning",
        title: "Sin datos",
        text: "No se encontró la unidad.",
      });
      return;
    }
    await Swal.fire({
      title: unit.acronym,
      html: buildUnitDetailHtml(unit),
      width: "min(94vw, 26rem)",
      padding: "1rem",
      buttonsStyling: false,
      confirmButtonText: "Cerrar",
      customClass: {
        popup: "sicen-unit-swal rounded-3 shadow-sm text-start",
        title: "sicen-unit-swal-title fs-6 fw-semibold mb-0 pb-2 border-bottom border-secondary-subtle text-body",
        htmlContainer:
          "sicen-unit-swal-body m-0 px-2 pt-2 pb-0 text-start overflow-hidden",
        actions: "sicen-unit-swal-actions mt-2 mb-0 pt-2 border-top border-secondary-subtle",
        confirmButton: "btn btn-outline-secondary btn-sm px-4",
      },
    });
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "No se pudo cargar",
      text: e?.message || "Error del servidor.",
      confirmButtonText: "Aceptar",
    });
  }
}

export function GestionUnidadesPage() {
  const { user } = useAuth();
  const isAdmin =
    user?.role === "admin" || user?.role === "superAdmin";

  const [unitsState, setUnitsState] = useState({
    loading: true,
    error: null,
    units: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listUnitsRegistered();
        if (!cancelled) {
          setUnitsState({
            loading: false,
            error: null,
            units: data.units ?? [],
          });
        }
      } catch (e) {
        if (!cancelled) {
          setUnitsState({
            loading: false,
            error: e?.message || "No se pudo cargar el listado.",
            units: [],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de unidades</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <p className="text-muted mb-4">
          {isAdmin
            ? "Alta y baja de unidades de Prefectura y modificación de datos asociados."
            : "Consulta de unidades registradas en el sistema."}
        </p>

        {isAdmin ? (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mb-4">
            <div className="col">
              <Link
                className="text-decoration-none"
                to="/gestion-unidades/sumar"
              >
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className="menu-tile-icon bi bi-plus-circle me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                        style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-body">
                          SUMAR UNIDAD
                        </div>
                        <div className="text-muted small">
                          Registrar nombre, datos de contacto, escudo PNG y
                          heráldica.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col">
              <Link
                className="text-decoration-none"
                to="/gestion-unidades/modificar"
              >
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className="menu-tile-icon bi bi-pencil-square me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                        style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-body">
                          MODIFICAR UNIDAD
                        </div>
                        <div className="text-muted small">
                          Actualizar datos de contacto, heráldica u opcionalmente
                          el escudo PNG.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col">
              <Link
                className="text-decoration-none"
                to="/gestion-unidades/borrar"
              >
                <div className="card h-100 shadow-sm border-danger">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className="menu-tile-icon bi bi-trash3 me-1 px-2 py-1 border border-danger rounded-1 bg-danger text-white flex-shrink-0"
                        style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-danger">
                          BORRAR UNIDAD
                        </div>
                        <div className="text-muted small">
                          Eliminar el registro y los archivos del escudo.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ) : (
          <div className="alert alert-secondary mb-4">
            Si necesita dar de alta una unidad, contacte a un administrador del
            sistema.
          </div>
        )}

        <h4 className="h5 text-muted text-uppercase mb-3">
          Unidades registradas
        </h4>

        {unitsState.loading ? (
          <p className="text-muted mb-0">Cargando unidades…</p>
        ) : unitsState.error ? (
          <div className="alert alert-danger mb-0">{unitsState.error}</div>
        ) : unitsState.units.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            No hay unidades registradas en la base de datos.
          </div>
        ) : (
          <div className="table-responsive border rounded">
            <table className="table table-hover table-sm align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="text-center">
                    Escudo
                  </th>
                  <th scope="col">Sigla</th>
                  <th scope="col">Nombre</th>
                  <th scope="col" className="d-none d-md-table-cell">
                    Dirección
                  </th>
                  <th scope="col" className="d-none d-lg-table-cell">
                    Teléfono
                  </th>
                  <th scope="col">Creación</th>
                </tr>
              </thead>
              <tbody>
                {unitsState.units.map((u) => (
                  <tr
                    key={u.acronym}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                    style={{ cursor: "pointer" }}
                    title="Ver datos completos"
                    onClick={() => openUnitDetailModal(u.acronym)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        openUnitDetailModal(u.acronym);
                      }
                    }}
                  >
                    <td className="text-center" style={{ width: "4rem" }}>
                      <img
                        src={u.shieldRelativeUrl || "/img/avatar.png"}
                        alt=""
                        className="object-fit-contain"
                        style={{
                          maxHeight: "2.5rem",
                          maxWidth: "3rem",
                        }}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/img/avatar.png";
                        }}
                      />
                    </td>
                    <td className="fw-semibold text-nowrap">{u.acronym}</td>
                    <td className="text-break">{u.name}</td>
                    <td className="d-none d-md-table-cell small text-muted text-break">
                      {u.address?.trim() ? u.address : "—"}
                    </td>
                    <td className="d-none d-lg-table-cell text-nowrap small">
                      {u.phone?.trim() ? u.phone : "—"}
                    </td>
                    <td className="text-nowrap small">
                      {formatDate(u.foundationDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </Layout>
  );
}
