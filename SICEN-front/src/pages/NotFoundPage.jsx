import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function NotFoundPage() {
  const { user, loading } = useAuth();
  const homeHref = user ? "/home" : "/login";
  const homeLabel = user ? "Ir al inicio" : "Ir al inicio de sesión";

  return (
    <Layout>
      <div className="container py-5 text-center">
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <img
              src="/img/404.png"
              alt=""
              className="img-fluid mx-auto d-block mb-4"
              style={{ maxWidth: "min(28rem, 100%)" }}
              loading="eager"
            />
            <h1 className="h3 fw-semibold text-body mb-2">Página no encontrada</h1>
            <p className="text-muted mb-4 mx-auto" style={{ maxWidth: "28rem" }}>
              La dirección que ingresó no corresponde a ninguna sección del
              sistema. Verifique la URL o utilice el menú para navegar.
            </p>
            <Link className="btn btn-primary" to={homeHref}>
              {homeLabel}
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}
