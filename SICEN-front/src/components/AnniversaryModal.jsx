import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getUnitAnniversariesToday } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const ESCUDO_BASE = "/img/ESCUDO-UNIDADES-PNN";
const STORAGE_KEY = "sicen.anniversaryModalSeen";

function todayKey(today) {
  if (!today) return "";
  const y = String(today.year).padStart(4, "0");
  const m = String(today.month).padStart(2, "0");
  const d = String(today.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeSeen(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* noop */
  }
}

function buildShieldSrc(item) {
  if (item.shieldRelativeUrl && item.shieldRelativeUrl.trim()) {
    return item.shieldRelativeUrl;
  }
  if (item.acronym) {
    return `${ESCUDO_BASE}/${encodeURIComponent(item.acronym.toUpperCase())}.png`;
  }
  return "/img/avatar.png";
}

function ordinalize(n) {
  return Number.isFinite(n) ? n.toLocaleString("es-UY") : n;
}

export function AnniversaryModal() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [anniversaries, setAnniversaries] = useState([]);
  const [today, setToday] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    setOpen(false);
    getUnitAnniversariesToday()
      .then((data) => {
        if (cancelled) return;
        if (data?.ok === false) return;
        const list = Array.isArray(data?.anniversaries) ? data.anniversaries : [];
        const t = data?.today || null;
        if (!list.length || !t) return;

        const key = todayKey(t);
        if (readSeen() === key) return;

        const userUnit = (user.unit || "").trim().toUpperCase();
        const ordered = userUnit
          ? [...list].sort((a, b) => {
              const aMine = a.acronym?.toUpperCase() === userUnit ? 0 : 1;
              const bMine = b.acronym?.toUpperCase() === userUnit ? 0 : 1;
              if (aMine !== bMine) return aMine - bMine;
              return (a.foundationYear || 0) - (b.foundationYear || 0);
            })
          : list;

        setAnniversaries(ordered);
        setToday(t);
        setOpen(true);
      })
      .catch((err) => {
        console.warn("[AnniversaryModal] No se pudieron cargar aniversarios:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    if (today) writeSeen(todayKey(today));
    setOpen(false);
  }

  if (!open || anniversaries.length === 0) return null;

  const single = anniversaries.length === 1;

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1080 }}
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anniversary-modal-title"
        style={{ zIndex: 1085, overflowY: "auto" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered ${
            single ? "modal-md" : "modal-lg"
          }`}
        >
          <div className="modal-content position-relative shadow-lg border-0">
            <button
              type="button"
              className="btn-close position-absolute top-0 end-0 m-3"
              aria-label="Cerrar"
              onClick={handleClose}
              style={{ zIndex: 2 }}
            />
            <div className="modal-body p-4 p-md-5 text-center">
              <div className="mb-3">
                <span className="badge text-bg-warning-subtle text-warning-emphasis fs-6 px-3 py-2 border border-warning-subtle">
                  <i className="bi bi-stars me-2" aria-hidden />
                  ¡Feliz aniversario!
                </span>
              </div>

              <h2
                id="anniversary-modal-title"
                className="h4 fw-semibold text-body mb-4"
              >
                {single
                  ? "Hoy celebramos el aniversario de una de nuestras Unidades."
                  : `Hoy celebramos ${anniversaries.length} aniversarios de Unidades.`}
              </h2>

              <div className={`row g-4 ${single ? "justify-content-center" : ""}`}>
                {anniversaries.map((item) => (
                  <div
                    key={item.acronym}
                    className={
                      single
                        ? "col-12"
                        : "col-12 col-md-6 d-flex"
                    }
                  >
                    <div className="w-100 d-flex flex-column align-items-center">
                      <div
                        className="d-flex align-items-center justify-content-center mb-3"
                        style={{
                          width: single ? "min(60vw, 240px)" : "min(40vw, 180px)",
                          height: single ? "min(60vw, 240px)" : "min(40vw, 180px)",
                        }}
                      >
                        <img
                          src={buildShieldSrc(item)}
                          alt={`Escudo de ${item.name}`}
                          className="object-fit-contain w-100 h-100"
                          style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.18))" }}
                          onError={(e) => {
                            e.currentTarget.src = "/img/avatar.png";
                          }}
                        />
                      </div>
                      <p
                        className="fw-semibold mb-1 px-2"
                        style={{
                          fontSize: single
                            ? "clamp(1.05rem, 2.6vmin, 1.4rem)"
                            : "clamp(0.95rem, 2vmin, 1.15rem)",
                          lineHeight: 1.25,
                        }}
                      >
                        ¡Hoy es el aniversario N° {ordinalize(item.anniversaryNumber)}
                        {" "}
                        de la {item.name}!
                      </p>
                      <div className="text-muted small">
                        Fundación: {item.foundationYear}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-primary mt-4 px-4"
                onClick={handleClose}
              >
                ¡Saludos!
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
