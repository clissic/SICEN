import { useCallback, useEffect, useState } from "react";
import { ModalPortal, SICEN_MODAL_Z_INDEX } from "../ModalPortal.jsx";
import {
  MONTH_OPTIONS,
  monthLabel,
  yearChoices,
} from "./borderPatrolCalendarUtils.js";

function MonthJumpModal({ open, year, month, onClose, onApply }) {
  const [draftYear, setDraftYear] = useState(year);
  const [draftMonth, setDraftMonth] = useState(month);

  useEffect(() => {
    if (!open) return;
    setDraftYear(year);
    setDraftMonth(month);
  }, [open, year, month]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="border-patrol-month-title"
        style={{ background: "rgba(0,0,0,0.45)", zIndex: SICEN_MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(event) => event.stopPropagation()}
        >
          <form
            className="modal-content"
            onSubmit={(event) => {
              event.preventDefault();
              onApply(Number(draftYear), Number(draftMonth));
            }}
          >
            <div className="modal-header">
              <h5 className="modal-title" id="border-patrol-month-title">
                Elegir mes y año
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="border-patrol-jump-month">
                  Mes
                </label>
                <select
                  id="border-patrol-jump-month"
                  className="form-select"
                  value={draftMonth}
                  onChange={(event) => setDraftMonth(Number(event.target.value))}
                >
                  {MONTH_OPTIONS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-0">
                <label className="form-label" htmlFor="border-patrol-jump-year">
                  Año
                </label>
                <select
                  id="border-patrol-jump-year"
                  className="form-select"
                  value={draftYear}
                  onChange={(event) => setDraftYear(Number(event.target.value))}
                >
                  {yearChoices(year).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer empre-patrol-month-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => {
                  const now = new Date();
                  onApply(now.getFullYear(), now.getMonth() + 1);
                }}
              >
                Hoy
              </button>
              <button type="submit" className="btn btn-primary">
                Ir
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

export function BorderPatrolMonthNav({ year, month, onShift, onJump }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={() => onShift(-1)}
        aria-label="Mes anterior"
      >
        <i className="bi bi-chevron-left" aria-hidden />
      </button>
      <button
        type="button"
        className="btn btn-link fw-semibold text-body text-decoration-none p-0"
        data-sicen-popover="Elegir mes y año"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {monthLabel(year, month)}
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={() => onShift(1)}
        aria-label="Mes siguiente"
      >
        <i className="bi bi-chevron-right" aria-hidden />
      </button>
      <MonthJumpModal
        open={open}
        year={year}
        month={month}
        onClose={close}
        onApply={(nextYear, nextMonth) => {
          setOpen(false);
          onJump(nextYear, nextMonth);
        }}
      />
    </div>
  );
}
