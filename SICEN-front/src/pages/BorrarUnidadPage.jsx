import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { deleteUnit, listUnitsRegistered } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

export function BorrarUnidadPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedAcronym, setSelectedAcronym] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function onConfirmDelete() {
    if (!selectedAcronym) {
      await Swal.fire({
        icon: "info",
        title: "Seleccione una unidad",
        text: "Elija la sigla que desea eliminar en el desplegable y vuelva a pulsar el botón.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const selected = units.find((u) => u.acronym === selectedAcronym);
    const nameLine = selected?.name
      ? `<li class="small text-muted">${escapeHtml(selected.name)}</li>`
      : "";

    const r = await confirmDelete({
      resource: "unidad",
      summaryHtml: `
        <p class="mb-2">
          Se borrará la unidad del sistema junto con los archivos PNG del
          escudo en el servidor:
        </p>
        <ul class="mb-2 ps-3">
          <li><strong>${escapeHtml(selectedAcronym)}</strong></li>
          ${nameLine}
        </ul>
      `,
      extraNote:
        "No podrá eliminarse si hay usuarios asignados a esta sigla.",
    });

    if (!r.isConfirmed) return;

    setDeleting(true);
    try {
      const data = await deleteUnit(selectedAcronym);
      await notifyDeleteSuccess(data.msg || "La unidad se eliminó correctamente.");
      navigate("/gestion-unidades");
    } catch (err) {
      await notifyDeleteError(err, "Error al eliminar la unidad.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="container-md py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Borrar unidad</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/gestion-unidades"
          >
            Volver a gestión de unidades
          </Link>
        </div>

        <p className="text-muted mb-4">
          Elimina el registro de la base de datos y los archivos del escudo
          asociados. Si existen cuentas de usuario asignados a esta Unidad, deberá
          reasignarlas antes de poder borrarla.
        </p>

        <div className="card border-danger shadow-sm">
          <div className="card-body p-4">
            <label className="form-label" htmlFor="bu-sigla-select">
              Unidad a eliminar
            </label>
            <select
              id="bu-sigla-select"
              className="form-select mb-4"
              value={selectedAcronym}
              onChange={(e) => setSelectedAcronym(e.target.value)}
              disabled={listLoading || deleting}
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

            <button
              type="button"
              className="btn btn-danger"
              disabled={!selectedAcronym || deleting || listLoading}
              onClick={onConfirmDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar unidad definitivamente"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
