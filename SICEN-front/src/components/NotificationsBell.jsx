import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsUnreadCount,
} from "../api/client.js";

const POLL_MS = 5 * 60 * 1000;

function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "hace un momento";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `hace ${m} min`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `hace ${h} h`;
  }
  return d.toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Campanita de notificaciones (badge de no leídas + dropdown).
 * Poller de unread-count cada 5 min; al abrir el panel carga el listado.
 */
export function NotificationsBell({ embedded = false }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [embeddedOpen, setEmbeddedOpen] = useState(false);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await notificationsUnreadCount();
      setUnread(Number(data?.count) || 0);
    } catch {
      /* silencioso */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListErr("");
    try {
      const data = await listNotifications({ page: 1, limit: 15 });
      const docs = Array.isArray(data?.docs)
        ? data.docs
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setItems(docs);
      await refreshUnread();
    } catch (e) {
      setListErr(e?.message || "No se pudieron cargar las notificaciones.");
    } finally {
      setLoadingList(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, POLL_MS);

    function onVisibility() {
      if (!document.hidden) refreshUnread();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshUnread]);

  useEffect(() => {
    if (embedded) return undefined;
    const btn = document.getElementById("sicenNotificationsBell");
    if (!btn) return undefined;

    function onShow() {
      loadList();
    }
    btn.addEventListener("show.bs.dropdown", onShow);
    return () => {
      btn.removeEventListener("show.bs.dropdown", onShow);
    };
  }, [embedded, loadList]);

  async function toggleEmbedded(event) {
    event.stopPropagation();
    const nextOpen = !embeddedOpen;
    setEmbeddedOpen(nextOpen);
    if (nextOpen) {
      await loadList();
    }
  }

  async function handleItemClick(n) {
    const id = n?._id;
    if (id && !n.readAt) {
      try {
        await markNotificationRead(id);
        setItems((prev) =>
          prev.map((row) =>
            String(row._id) === String(id)
              ? { ...row, readAt: new Date().toISOString() }
              : row
          )
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        /* seguir navegando igual */
      }
    }
    const href = String(n?.href || "").trim();
    if (href.startsWith("/")) {
      navigate(href);
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((row) =>
          row.readAt ? row : { ...row, readAt: new Date().toISOString() }
        )
      );
      setUnread(0);
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  }

  const badgeLabel = unread > 99 ? "99+" : String(unread);

  const panel = (
    <>
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <span className="fw-semibold small mb-0">Notificaciones</span>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none p-0"
          disabled={markingAll || unread === 0}
          onClick={handleMarkAll}
        >
          Marcar todas
        </button>
      </div>
      <div style={{ maxHeight: "18rem", overflowY: "auto" }}>
        {loadingList ? (
          <div className="px-3 py-3 text-muted small">Cargando…</div>
        ) : listErr ? (
          <div className="px-3 py-3 text-danger small">{listErr}</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-3 text-muted small">
            No hay notificaciones.
          </div>
        ) : (
          items.map((n) => {
            const unreadItem = !n.readAt;
            return (
              <button
                key={String(n._id)}
                type="button"
                className={`dropdown-item text-wrap py-2 px-3 border-bottom ${
                  unreadItem ? "bg-body-secondary" : ""
                }`}
                onClick={() => handleItemClick(n)}
              >
                <div className="d-flex justify-content-between gap-2">
                  <span className={`small ${unreadItem ? "fw-semibold" : ""}`}>
                    {n.title || "Aviso"}
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                    {formatRelative(n.createdAt)}
                  </span>
                </div>
                {n.body ? (
                  <div
                    className="text-muted mt-1"
                    style={{ fontSize: "0.78rem", lineHeight: 1.3 }}
                  >
                    {n.body}
                  </div>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div
        className="w-100"
        style={{ minWidth: "min(78vw, 20rem)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary position-relative d-flex align-items-center justify-content-center gap-2 w-100"
          aria-expanded={embeddedOpen}
          aria-controls="sicenNotificationsEmbeddedPanel"
          onClick={toggleEmbedded}
          aria-label={
            unread > 0
              ? `Notificaciones, ${unread} sin leer`
              : "Notificaciones"
          }
        >
          <i className="bi bi-bell" aria-hidden />
          <span>Notificaciones</span>
          {unread > 0 ? (
            <span className="badge rounded-pill bg-danger">
              {badgeLabel}
              <span className="visually-hidden"> no leídas</span>
            </span>
          ) : null}
        </button>
        {embeddedOpen ? (
          <div
            id="sicenNotificationsEmbeddedPanel"
            className="border rounded shadow-sm bg-body mt-2 overflow-hidden"
          >
            {panel}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="dropdown">
      <button
        type="button"
        id="sicenNotificationsBell"
        className="btn btn-sm btn-outline-secondary position-relative d-inline-flex align-items-center justify-content-center"
        style={{ width: "2.25rem", height: "2.25rem" }}
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        data-sicen-popover="Notificaciones"
        data-sicen-popover-placement="bottom"
        aria-expanded="false"
        aria-label={
          unread > 0
            ? `Notificaciones, ${unread} sin leer`
            : "Notificaciones"
        }
      >
        <i className="bi bi-bell" aria-hidden />
        {unread > 0 ? (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{
              fontSize: "0.65rem",
              lineHeight: 1,
              padding: "0.2em 0.4em",
              minWidth: "1.1rem",
            }}
          >
            {badgeLabel}
            <span className="visually-hidden">no leídas</span>
          </span>
        ) : null}
      </button>
      <div
        className="dropdown-menu dropdown-menu-end shadow p-0"
        style={{ width: "min(92vw, 22rem)" }}
        aria-labelledby="sicenNotificationsBell"
      >
        {panel}
      </div>
    </div>
  );
}
