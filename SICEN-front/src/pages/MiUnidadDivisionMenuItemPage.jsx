import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { ProcedimientosFilesList } from "../components/ProcedimientosFilesList.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getMiUnidadDivisionMenuItem } from "../constants/miUnidadDivisionMenus.js";

export function MiUnidadDivisionMenuItemPage() {
  const { user } = useAuth();
  const { divisionSlug, sectionSlug, itemSlug } = useParams();
  const resolved = getMiUnidadDivisionMenuItem(
    divisionSlug,
    sectionSlug,
    itemSlug
  );

  if (!resolved) {
    return <Navigate to="/mi-unidad" replace />;
  }

  const { division, section, item } = resolved;
  const showProcedimientos =
    item.slug === "procedimientos" &&
    (division.slug === "division-i" || division.slug === "division-ii");
  const procedimientosFilesDivision =
    division.slug === "division-ii" ? "DIV-II" : "DIV-I";
  const userUnit = user?.unit?.trim() ?? "";

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-muted small text-uppercase mb-1">
              {division.title} · {section.title}
            </p>
            <h3 className="m-0">{item.title}</h3>
            <p className="text-muted small mb-0 mt-1">{item.subtitle}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-secondary btn-sm"
              to={`/mi-unidad/${division.slug}`}
            >
              {division.title}
            </Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/mi-unidad">
              Mi Unidad
            </Link>
          </div>
        </div>
        {showProcedimientos ? (
          <ProcedimientosFilesList
            userUnit={userUnit}
            filesDivision={procedimientosFilesDivision}
          />
        ) : (
          <div className="alert alert-secondary mb-0">
            Contenido en preparación.
          </div>
        )}
      </div>
    </Layout>
  );
}
