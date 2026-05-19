import { useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { completeUserTutorial } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { hasCompletedUserTutorial } from "../utils/userTutorial.js";

export function ManualUsuarioPage() {
  const { user, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const completed = hasCompletedUserTutorial(user);

  async function handleComplete() {
    setSaving(true);
    try {
      const data = await completeUserTutorial();
      await refresh();
      await Swal.fire({
        icon: "success",
        title: "Curso completado",
        text:
          data.msg ||
          "Ya puede utilizar todas las opciones del menú principal.",
        confirmButtonText: "Ir al menú principal",
      });
    } catch (ex) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo registrar",
        text: ex.message || "Intente nuevamente.",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Manual usuario</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Volver al menú
          </Link>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            <p className="text-muted">
              Este curso introduce el uso de SICEN. Revise el material y, al
              finalizar, confirme que completó la capacitación para habilitar el
              resto del sistema.
            </p>

            <div className="border rounded-3 p-4 bg-body-tertiary mb-4">
              <h4 className="h6 fw-semibold mb-2">Contenido del curso</h4>
              <p className="small text-muted mb-0">
                El material completo del Manual usuario se publicará aquí. Por
                ahora, utilice este espacio como guía inicial y confirme la
                finalización cuando haya leído las indicaciones de su unidad.
              </p>
            </div>

            {completed ? (
              <div className="alert alert-success py-2 mb-0" role="status">
                Ya completó el Manual usuario. Puede acceder a todas las
                opciones del menú principal.
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleComplete}
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? "Registrando…" : "Confirmar curso completado"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
