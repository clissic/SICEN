import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function UsersMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de usuarios</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/nuevo">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Crear</div>
                  <div className="text-muted small">Alta de usuario</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/todos">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Consultar</div>
                  <div className="text-muted small">Listado paginado</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/editar">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Modificar</div>
                  <div className="text-muted small">Buscar y editar</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/eliminar">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold text-danger">Borrar</div>
                  <div className="text-muted small">Eliminar usuario</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
