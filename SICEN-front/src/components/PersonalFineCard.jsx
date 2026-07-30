import {
  formatAmount,
  provesAsArray,
  statusMeta,
} from "../utils/carFineFormatters.js";

const SEX_LABELS = {
  M: "Masculino",
  F: "Femenino",
  X: "Otro / No especifica",
};

/** Devuelve el DNI formateado (1.234.567-8) cuando es posible. */
export function formatCI(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length < 7) return digits;
  const dv = digits.slice(-1);
  const body = digits.slice(0, -1);
  const withDots = body
    .split("")
    .reverse()
    .reduce((acc, ch, idx) => {
      acc.push(ch);
      if ((idx + 1) % 3 === 0 && idx + 1 < body.length) acc.push(".");
      return acc;
    }, [])
    .reverse()
    .join("");
  return `${withDots}-${dv}`;
}

/** Convierte YYYY-MM-DD → DD/MM/YYYY (acepta otros formatos de paso). */
export function formatBirthDate(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

/** Edad aproximada a partir de una fecha de nacimiento ISO. */
export function calcAge(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m ||
    (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function formatSex(value) {
  const key = String(value || "").trim().toUpperCase();
  return SEX_LABELS[key] || (key ? key : "");
}

export function formatPersonName(fine) {
  const first = String(fine?.person_first_name || "").trim();
  const last = String(fine?.person_last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "—";
}

/**
 * Tarjeta de una multa personal. Reutiliza los estilos `.car-fine-card*` para
 * mantener consistencia visual.
 */
export function PersonalFineCard({
  fine,
  onStatusEdit,
  onDataEdit,
  onOpenProve,
}) {
  const st = statusMeta(fine.fine_status);
  const ci = formatCI(fine.person_ci);
  const fullName = formatPersonName(fine);
  const birth = formatBirthDate(fine.person_birth_date);
  const age = calcAge(fine.person_birth_date);
  const sex = formatSex(fine.person_sex);
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
                  data-sicen-popover="Cambiar estado"
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
                  data-sicen-popover="Editar datos de la multa"
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
            {ci ? (
              <span className="car-fine-card__plate" data-sicen-popover={`DNI ${ci}`}>
                {ci}
              </span>
            ) : (
              <span className="car-fine-card__plate car-fine-card__plate--placeholder">
                Sin DNI
              </span>
            )}
            <div className="d-flex align-items-center gap-2 min-w-0 flex-grow-1">
              <i
                className="bi bi-person-fill text-secondary flex-shrink-0"
                aria-hidden
              />
              <span className="fw-semibold text-truncate" data-sicen-popover={fullName}>
                {fullName}
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
                    <i className="bi bi-flag-fill" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">
                      Nacionalidad
                    </div>
                    <div className="car-fine-card__field-value">
                      {fine.person_nationality || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="car-fine-card__field">
                  <span className="car-fine-card__field-icon">
                    <i className="bi bi-calendar-heart" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">
                      Nacimiento
                    </div>
                    <div className="car-fine-card__field-value">
                      {birth || "—"}
                      {age != null ? (
                        <span className="text-muted"> · {age} años</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="car-fine-card__field">
                  <span className="car-fine-card__field-icon">
                    <i className="bi bi-gender-ambiguous" aria-hidden />
                  </span>
                  <div className="car-fine-card__field-body">
                    <div className="car-fine-card__field-label">Sexo</div>
                    <div className="car-fine-card__field-value">
                      {sex || "—"}
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

              {fine.person_tel && fine.person_tel !== "S/D" ? (
                <div className="col-12 col-md-6">
                  <div className="car-fine-card__field">
                    <span className="car-fine-card__field-icon">
                      <i className="bi bi-telephone" aria-hidden />
                    </span>
                    <div className="car-fine-card__field-body">
                      <div className="car-fine-card__field-label">Teléfono</div>
                      <div className="car-fine-card__field-value">
                        {fine.person_tel}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {fine.person_dir && fine.person_dir !== "S/D" ? (
                <div className="col-12 col-md-6">
                  <div className="car-fine-card__field">
                    <span className="car-fine-card__field-icon">
                      <i className="bi bi-geo-alt" aria-hidden />
                    </span>
                    <div className="car-fine-card__field-body">
                      <div className="car-fine-card__field-label">
                        Dirección
                      </div>
                      <div className="car-fine-card__field-value">
                        {fine.person_dir}
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
                              plate: ci,
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
                      data-sicen-popover={String(p)}
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
