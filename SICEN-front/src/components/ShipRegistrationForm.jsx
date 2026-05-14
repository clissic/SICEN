import { Link } from "react-router-dom";
import { CLASSIFICATION_SOCIETY_OPTIONS } from "../constants/classificationSocieties.js";
import { FLAG_STATE_OPTIONS } from "../constants/flagStates.js";
import {
  RECREATIONAL_DOC_OPTIONS,
  VESSEL_TYPE_OPTIONS,
} from "../constants/shipRegistrationFormDefaults.js";
import { SHIP_TYPE_OPTIONS } from "../constants/shipTypes.js";
import { SPORT_SHIP_TYPE_OPTIONS } from "../constants/sportShipTypes.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";

function fieldset(title, children, { disabled = false } = {}) {
  return (
    <fieldset
      className="border rounded-3 px-3 pt-2 pb-3 mb-4"
      disabled={disabled}
    >
      <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
        {title}
      </legend>
      <div className="row g-3">{children}</div>
    </fieldset>
  );
}

/**
 * Formulario compartido de registro / edición de buque mercante o deportivo.
 */
export function ShipRegistrationForm({
  form,
  set,
  setVesselType,
  setRecreationalDocType,
  setClassificationKind,
  onSubmit,
  submitting,
  title,
  subtitle,
  cancelHref,
  submitLabel,
  submittingLabel = "Guardando…",
  msg,
  err,
  clientErr,
}) {
  const isUltramar = form.vesselType === "Ultramar";
  const isCabotaje = form.vesselType === "Cabotaje";
  const isDeportivo = form.vesselType === "Deportivo";

  return (
    <>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h3 className="m-0">{title}</h3>
        <Link className="btn btn-outline-secondary btn-sm" to="/base-buques">
          Gestión de buques
        </Link>
      </div>
      {subtitle ? (
        <p className="text-muted small mb-4">{subtitle}</p>
      ) : null}

      {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
      {err ? <div className="alert alert-danger py-2">{err}</div> : null}
      {clientErr && !err ? (
        <div className="alert alert-warning py-2">{clientErr}</div>
      ) : null}

      <form onSubmit={onSubmit}>
        {fieldset(
          "Identificación del buque",
          <>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="vesselType">
                Tipo de buque
              </label>
              <select
                id="vesselType"
                className="form-select"
                required
                value={form.vesselType}
                onChange={(e) => setVesselType(e.target.value)}
              >
                {VESSEL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="name">
                Nombre del buque
              </label>
              <input
                id="name"
                className="form-control"
                required
                autoComplete="off"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="imoNumber">
                Número OMI
                {isUltramar ? (
                  <span className="text-danger"> *</span>
                ) : isCabotaje ? (
                  <span className="text-muted small fw-normal">
                    {" "}
                    (opcional)
                  </span>
                ) : isDeportivo ? (
                  <span className="text-muted small fw-normal">
                    {" "}
                    (no aplica)
                  </span>
                ) : null}
              </label>
              <input
                id="imoNumber"
                className="form-control"
                required={isUltramar}
                disabled={isDeportivo}
                autoComplete="off"
                value={form.imoNumber}
                onChange={(e) => set("imoNumber", e.target.value)}
                placeholder=""
              />
            </div>
            <div className="col-12 col-md-6">
              <label
                className="form-label"
                htmlFor="nationalRegistryNumber"
              >
                Matrícula nacional
                {isCabotaje || isDeportivo ? (
                  <span className="text-danger"> *</span>
                ) : null}
              </label>
              <input
                id="nationalRegistryNumber"
                className="form-control"
                required={isCabotaje || isDeportivo}
                disabled={isUltramar}
                autoComplete="off"
                value={form.nationalRegistryNumber}
                onChange={(e) =>
                  set("nationalRegistryNumber", e.target.value)
                }
                placeholder={isUltramar ? "Solo cabotaje o deportivo" : ""}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="mmsi">
                MMSI
              </label>
              <input
                id="mmsi"
                className="form-control"
                autoComplete="off"
                value={form.mmsi}
                onChange={(e) => set("mmsi", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="callSign">
                Indicativo de llamada (call sign)
              </label>
              <input
                id="callSign"
                className="form-control"
                autoComplete="off"
                value={form.callSign}
                onChange={(e) => set("callSign", e.target.value)}
              />
            </div>
            {isDeportivo ? (
              <div className="col-12 col-md-6">
                <label
                  className="form-label"
                  htmlFor="recreationalDocType"
                >
                  Documentación deportiva
                  <span className="text-danger"> *</span>
                </label>
                <select
                  id="recreationalDocType"
                  className="form-select"
                  required
                  value={form.recreationalDocType}
                  onChange={(e) => setRecreationalDocType(e.target.value)}
                >
                  {RECREATIONAL_DOC_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        )}

        {fieldset(
          "Información general",
          <>
            <div className="col-12 col-lg-4">
              <label className="form-label" htmlFor="flagState">
                Estado de bandera
              </label>
              <select
                id="flagState"
                className="form-select"
                required
                value={form.flagState}
                onChange={(e) => set("flagState", e.target.value)}
              >
                <option value="">Seleccione país…</option>
                {FLAG_STATE_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-lg-4">
              <label className="form-label" htmlFor="portOfRegistry">
                Puerto de matrícula
              </label>
              <input
                id="portOfRegistry"
                className="form-control"
                required
                value={form.portOfRegistry}
                onChange={(e) =>
                  set("portOfRegistry", e.target.value.toUpperCase())
                }
              />
            </div>
            <div className="col-12 col-lg-4">
              <label className="form-label" htmlFor="yearBuilt">
                Año de construcción
              </label>
              <input
                id="yearBuilt"
                type="number"
                className="form-control"
                required
                min={1800}
                max={2100}
                step={1}
                onKeyDown={preventNegativeNumberKeys}
                value={form.yearBuilt}
                onChange={(e) => set("yearBuilt", e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="shipType">
                Tipo de buque
              </label>
              <select
                id="shipType"
                className="form-select"
                required
                value={form.shipType}
                onChange={(e) => set("shipType", e.target.value)}
              >
                <option value="">Seleccione un tipo de buque…</option>
                {(isDeportivo ? SPORT_SHIP_TYPE_OPTIONS : SHIP_TYPE_OPTIONS).map(
                  (label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          </>
        )}

        {fieldset(
          "Características técnicas",
          <>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="grossTonnage">
                Arqueo bruto (GT)
              </label>
              <input
                id="grossTonnage"
                type="number"
                className="form-control"
                required
                min={0}
                step="any"
                onKeyDown={preventNegativeNumberKeys}
                value={form.grossTonnage}
                onChange={(e) => set("grossTonnage", e.target.value)}
                placeholder="Toneladas de arqueo (GT)"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="netTonnage">
                Arqueo neto (NT)
              </label>
              <input
                id="netTonnage"
                type="number"
                className="form-control"
                required={!isDeportivo}
                disabled={isDeportivo}
                min={0}
                step="any"
                onKeyDown={preventNegativeNumberKeys}
                value={form.netTonnage}
                onChange={(e) => set("netTonnage", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="deadweight">
                Peso muerto (DWT)
              </label>
              <input
                id="deadweight"
                type="number"
                className="form-control"
                required={!isDeportivo}
                disabled={isDeportivo}
                min={0}
                step="any"
                onKeyDown={preventNegativeNumberKeys}
                value={form.deadweight}
                onChange={(e) => set("deadweight", e.target.value)}
              />
            </div>
            <div
              className={`col-12 col-md-6 ${
                isDeportivo ? "col-lg-3" : "col-lg-4"
              }`}
            >
              <label className="form-label" htmlFor="lengthOverall">
                Eslora total (LOA)
              </label>
              <input
                id="lengthOverall"
                type="number"
                className="form-control"
                required
                min={0}
                step="any"
                onKeyDown={preventNegativeNumberKeys}
                value={form.lengthOverall}
                onChange={(e) => set("lengthOverall", e.target.value)}
              />
            </div>
            <div
              className={`col-12 col-md-6 ${
                isDeportivo ? "col-lg-3" : "col-lg-4"
              }`}
            >
              <label className="form-label" htmlFor="beam">
                Manga
              </label>
              <input
                id="beam"
                type="number"
                className="form-control"
                required
                min={0}
                step="any"
                onKeyDown={preventNegativeNumberKeys}
                value={form.beam}
                onChange={(e) => set("beam", e.target.value)}
              />
            </div>
            {isDeportivo ? (
              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label" htmlFor="puntal">
                  Puntal
                </label>
                <input
                  id="puntal"
                  type="number"
                  className="form-control"
                  required
                  min={0}
                  step="any"
                  onKeyDown={preventNegativeNumberKeys}
                  value={form.puntal}
                  onChange={(e) => set("puntal", e.target.value)}
                />
              </div>
            ) : null}
            <div
              className={`col-12 col-md-6 ${
                isDeportivo ? "col-lg-3" : "col-lg-4"
              }`}
            >
              <label className="form-label" htmlFor="draft">
                Calado
              </label>
              <input
                id="draft"
                type="number"
                className="form-control"
                required
                min={0}
                step="any"
                onKeyDown={preventNegativeNumberKeys}
                value={form.draft}
                onChange={(e) => set("draft", e.target.value)}
              />
            </div>
          </>
        )}

        {fieldset(
          "Propiedad",
          <>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="owner">
                Propietario
              </label>
              <input
                id="owner"
                className="form-control"
                required
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="operator">
                Operador
              </label>
              <input
                id="operator"
                className="form-control"
                required
                value={form.operator}
                onChange={(e) => set("operator", e.target.value)}
              />
            </div>
          </>
        )}

        {fieldset(
          "Clasificación",
          <>
            <div className="col-12 col-lg-4">
              <label className="form-label" htmlFor="classificationKind">
                Tipo de clasificación
              </label>
              <select
                id="classificationKind"
                className="form-select"
                required={!isDeportivo}
                value={form.classificationKind}
                onChange={(e) => setClassificationKind(e.target.value)}
              >
                <option value="">Seleccione…</option>
                <option value="recognized">Sociedad reconocida</option>
                <option value="flag">Bandera</option>
              </select>
            </div>
            <div className="col-12 col-lg-4">
              <label
                className="form-label"
                htmlFor="classificationSociety"
              >
                Sociedad reconocida
              </label>
              <select
                id="classificationSociety"
                className="form-select"
                required={form.classificationKind === "recognized"}
                disabled={form.classificationKind !== "recognized"}
                value={form.classificationSociety}
                onChange={(e) =>
                  set("classificationSociety", e.target.value)
                }
              >
                <option value="">
                  Seleccione sociedad de clasificación…
                </option>
                {CLASSIFICATION_SOCIETY_OPTIONS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-lg-4">
              <label
                className="form-label"
                htmlFor="classificationFlagRegistry"
              >
                Estado clasificador
              </label>
              <select
                id="classificationFlagRegistry"
                className="form-select"
                required={form.classificationKind === "flag"}
                disabled={form.classificationKind !== "flag"}
                value={form.classificationFlagRegistry}
                onChange={(e) =>
                  set("classificationFlagRegistry", e.target.value)
                }
              >
                <option value="">Seleccione país…</option>
                {FLAG_STATE_OPTIONS.map((name) => (
                  <option key={`cf-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </>,
          { disabled: isDeportivo }
        )}

        {fieldset(
          "Tripulación",
          <>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="master">
                Capitán / master
              </label>
              <input
                id="master"
                className="form-control"
                required
                value={form.master}
                onChange={(e) => set("master", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="crewCapacity">
                Capacidad de tripulación
              </label>
              <input
                id="crewCapacity"
                type="number"
                className="form-control"
                required
                min={0}
                step={1}
                onKeyDown={preventNegativeNumberKeys}
                value={form.crewCapacity}
                onChange={(e) => set("crewCapacity", e.target.value)}
              />
            </div>
          </>
        )}

        <div className="row g-3 justify-content-end pt-2">
          <div className="col-12 col-sm-auto d-flex flex-wrap gap-2 justify-content-end">
            <Link className="btn btn-outline-secondary" to={cancelHref}>
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
