import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { USER_TUTORIAL_SWAL_TEXT } from "../utils/userTutorial.js";

export function UserTutorialRequiredPage() {
  return (
    <Layout>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm border-warning-subtle">
              <div className="card-body p-4 p-md-5 text-center">
                <i
                  className="bi bi-book text-warning mb-3 d-block"
                  style={{ fontSize: "2.5rem" }}
                  aria-hidden
                />
                <h1 className="h4 mb-3">Curso Manual usuario pendiente</h1>
                <p className="text-muted mb-4">{USER_TUTORIAL_SWAL_TEXT}</p>
                <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                  <Link className="btn btn-primary" to="/home">
                    Menú principal
                  </Link>
                  <Link className="btn btn-outline-primary" to="/manual-usuario">
                    Manual usuario
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
