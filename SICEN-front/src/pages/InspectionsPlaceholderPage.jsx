import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import {
  currentExerciseYear,
  getActiveInspectionYear,
  subscribeActiveInspectionYear,
} from "../utils/inspectionExercise.js";

/**
 * Pantalla provisional para los flujos de Inspecciones (ingresar, modificar,
 * eliminar) hasta que se implemente cada formulario. Muestra el ejercicio
 * activo seleccionado en el menú para reforzar que el filtro anual se aplica.
 */
export function InspectionsPlaceholderPage({ title, description }) {
  const [year, setYear] = useState(
    () => getActiveInspectionYear() ?? currentExerciseYear()
  );

  useEffect(() => {
    return subscribeActiveInspectionYear((next) => {
      setYear(next ?? currentExerciseYear());
    });
  }, []);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">{title}</h3>
            <p className="text-muted small mb-0 mt-1">
              Ejercicio activo:{" "}
              <span className="fw-semibold text-body">{year}</span>
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/inspecciones"
          >
            Inspecciones
          </Link>
        </div>
        <div className="alert alert-secondary mb-0">
          {description ||
            "Esta sección está en desarrollo. Pronto podrá utilizarse desde aquí."}
        </div>
      </div>
    </Layout>
  );
}
