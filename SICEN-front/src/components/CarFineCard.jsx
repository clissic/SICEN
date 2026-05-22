import {
  formatAmount,
  formatPlate,
  formatVehicle,
  provesAsArray,
  statusMeta,
} from "../utils/carFineFormatters.js";

/**
 * Tarjeta de una multa vehicular. Reutilizable desde la página de consulta y
 * desde el flujo de eliminación: las acciones de cambio de estado / edición
 * son opcionales (se omiten si no se proveen los handlers).
 *
 * Props:
 * - fine: documento de la multa.
 * - onStatusEdit?: (fine) => void   → si se pasa, el badge de estado se vuelve botón.
 * - onDataEdit?:   (fine) => void   → si se pasa, agrega botón "Editar" al lado.
 * - onOpenProve?:  (info) => void   → al hacer clic en una miniatura.
 *     `info = { items, index, fineNumber, plate }`
 */
export function CarFineCard({ fine, onStatusEdit, onDataEdit, onOpenProve }) {
  const st = statusMeta(fine.fine_status);
  const plate = formatPlate(fine.car_reg_number);
  const vehicle = formatVehicle(fine.car_brand, fine.car_model);
  const proves = provesAsArray(fine.fine_proves);
  const cardClass = `car-fine-card card shadow-sm${
    st.modifier ? ` car-fine-card--${st.modifier}` : ""
  }`;

  return (
    <div className={`${cardClass} w-100 h-100 d-flex flex-column`}>
      <div className="car-fine-card__header">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-baseline gap-3">
            <div className="d-flex flex-column">
              <span className="car-fine-card__number-label">Multa N°</span>
              <span className="car-fine-card__number">
                {fine.fine_number ?? "—"}
              </span>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              {onStatusEdit ? (
                <button
                  type="button"
                  className="car-fine-card__status car-fine-card__status--btn"
                  onClick={() => onStatusEdit(fine)}
                  aria-label={`Cambiar estado de la multa N° ${fine.fine_number}`}
                  title="Cambiar estado"
                >
                  <i className={`bi ${st.icon}`} aria-hidden />
                  <span>{st.label}</span>
                  <i
                    className="bi bi-pencil-square ms-1 opacity-75"
                    aria-hidden
                    style={{ fontSize: "0.85em" }}
                  />
                </button>
              ) : (
                <span className="car-fine-card__status">
                  <i className={`bi ${st.icon}`} aria-hidden />
                  {st.label}
                </span>
              )}
              {onDataEdit ? (
                <button
                  type="button"
                  className="car-fine-card__edit-btn"
                  onClick={() => onDataEdit(fine)}
                  aria-label={`Editar datos de la multa N° ${fine.fine_number}`}
                  title="Editar datos de la multa"
                >
                  <i className="bi bi-pencil-fill" aria-hidden />
                  <span>Editar</span>
                </button>
              ) : null}
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3">
            <span className="car-fine-card__datetime">
              <i className="bi bi-calendar3" aria-hidden />
              {fine.fine_date || "—"}
            </span>
            {fine.fine_time ? (
              <span className="car-fine-card__datetime">
                <i className="bi bi-clock" aria-hidden />
                {fine.fine_time}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card-body d-flex flex-column flex-grow-1">
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-wrap align-items-center gap-3 w-100">
            {plate ? (
              <span
                className="car-fine-card__plate"
                title={`Matrícula ${plate}`}
              >
                {plate}
              </span>
            ) : (
              <span className="car-fine-card__plate car-fine-card__plate--placeholder">
                Sin matrícula
              </span>
            )}
            <div className="d-flex align-items-center gap-2 min-w-0 flex-grow-1">
              <i
                className="bi bi-car-front-fill text-secondary flex-shrink-0"
                aria-hidden
              />
              <span className="fw-semibold text-truncate">
                {vehicle || "Sin datos del vehículo"}
              </span>
            </div>
          </div>

          <div className="w-100">
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <div className="car-fine-card__field">
                  <span className="car-fine-card__field-icon">
                    <i className="bi bi-receipt" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">Artículo</div>
                    <div className="car-fine-card__field-value car-fine-card__field-value-strong">
                      {fine.fine_article || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="car-fine-card__field">
                  <span className="car-fine-card__field-icon">
                    <i className="bi bi-cash-coin" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">Importe</div>
                    <div>
                      <span className="car-fine-card__amount">
                        {formatAmount(fine.fine_amount)}
                      </span>
                      <span className="car-fine-card__amount-unit">U.R.</span>
                      {fine.fine_extra_amount &&
                      Number(fine.fine_extra_amount) > 0 ? (
                        <span className="car-fine-card__amount-extra">
                          + {formatAmount(fine.fine_extra_amount)} extra
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="car-fine-card__field">
                  <span className="car-fine-card__field-icon">
                    <i className="bi bi-person-vcard" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">Titular</div>
                    <div className="car-fine-card__field-value">
                      {fine.owner_name || "—"}
                      {fine.owner_ci ? (
                        <span className="text-muted"> · {fine.owner_ci}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="car-fine-card__field">
                  <span className="car-fine-card__field-icon">
                    <i className="bi bi-shield-check" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">
                      Autor de la multa
                    </div>
                    <div className="car-fine-card__field-value text-break">
                      {fine.fine_author || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {fine.owner_tel ? (
                <div className="col-12 col-md-6">
                  <div className="car-fine-card__field">
                    <span className="car-fine-card__field-icon">
                      <i className="bi bi-telephone" aria-hidden />
                    </span>
                    <div className="car-fine-card__field-body">
                      <div className="car-fine-card__field-label">Teléfono</div>
                      <div className="car-fine-card__field-value">
                        {fine.owner_tel}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {fine.owner_dir ? (
                <div className="col-12 col-md-6">
                  <div className="car-fine-card__field">
                    <span className="car-fine-card__field-icon">
                      <i className="bi bi-geo-alt" aria-hidden />
                    </span>
                    <div className="car-fine-card__field-body">
                      <div className="car-fine-card__field-label">Dirección</div>
                      <div className="car-fine-card__field-value">
                        {fine.owner_dir}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {proves.length > 0 ? (
          <div className="car-fine-card__proves">
            <div className="car-fine-card__proves-header">
              <i className="bi bi-camera-fill" aria-hidden />
              <span>Pruebas</span>
              <span className="car-fine-card__proves-count">
                {proves.length}
              </span>
            </div>
            <div
              className="car-fine-card__proves-gallery"
              style={{ "--prove-count": proves.length }}
            >
              {(() => {
                const imageItems = proves.filter(
                  (p) => typeof p === "string" && p.startsWith("/uploads/")
                );
                return proves.map((p, idx) => {
                  const isImg =
                    typeof p === "string" && p.startsWith("/uploads/");
                  if (isImg) {
                    const imageIdx = imageItems.indexOf(p);
                    return (
                      <button
                        key={`${p}-${idx}`}
                        type="button"
                        className="car-fine-card__prove"
                        aria-label={`Abrir prueba ${idx + 1}`}
                        onClick={() => {
                          if (typeof onOpenProve === "function") {
                            onOpenProve({
                              items: imageItems,
                              index: imageIdx >= 0 ? imageIdx : 0,
                              fineNumber: fine.fine_number,
                              plate,
                            });
                          }
                        }}
                      >
                        <img src={p} alt={`Prueba ${idx + 1}`} loading="lazy" />
                        <span className="car-fine-card__prove-index">
                          {idx + 1}
                        </span>
                        <span className="car-fine-card__prove-overlay">
                          Ver
                        </span>
                      </button>
                    );
                  }
                  return (
                    <span
                      key={`${p}-${idx}`}
                      className="badge text-bg-secondary text-truncate"
                      style={{ maxWidth: 240 }}
                      title={String(p)}
                    >
                      {String(p)}
                    </span>
                  );
                });
              })()}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
