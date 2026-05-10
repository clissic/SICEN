import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { createUnit } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function SumarUnidadPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);

    const escudo = fd.get("escudo");
    if (!escudo || typeof escudo !== "object" || escudo.size === 0) {
      fd.delete("escudo");
    }

    setSubmitting(true);
    try {
      const data = await createUnit(fd);
      await Swal.fire({
        icon: "success",
        title: "Unidad registrada",
        text: data.msg || "La unidad se creó correctamente.",
        confirmButtonText: "Aceptar",
      });
      navigate("/gestion-unidades");
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo registrar",
        text: err?.message || "Error del servidor.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container-md py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Sumar unidad</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/gestion-unidades"
          >
            Volver a gestión de unidades
          </Link>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={onSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-nombre">
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input
                    id="su-nombre"
                    name="nombre"
                    type="text"
                    className="form-control"
                    required
                    maxLength={200}
                    autoComplete="organization"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-sigla">
                    Sigla <span className="text-danger">*</span>
                  </label>
                  <input
                    id="su-sigla"
                    name="sigla"
                    type="text"
                    className="form-control text-uppercase"
                    required
                    minLength={4}
                    maxLength={6}
                    pattern="[A-Za-z0-9]{4,6}"
                    title="4 a 6 caracteres alfanuméricos"
                    autoComplete="off"
                  />
                  <div className="form-text">
                    Se guardará en mayúsculas; entre 4 y 6 caracteres.
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="su-dir">
                    Dirección
                  </label>
                  <input
                    id="su-dir"
                    name="direccion"
                    type="text"
                    className="form-control"
                    maxLength={500}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-tel">
                    Teléfono
                  </label>
                  <input
                    id="su-tel"
                    name="telefono"
                    type="text"
                    className="form-control"
                    maxLength={50}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-fecha">
                    Fecha de creación <span className="text-danger">*</span>
                  </label>
                  <input
                    id="su-fecha"
                    name="fechaCreacion"
                    type="date"
                    className="form-control"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-eradio">
                    Email Sala de Radio
                  </label>
                  <input
                    id="su-eradio"
                    name="emailRadio"
                    type="email"
                    className="form-control"
                    maxLength={120}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-epm">
                    Email Policía Marítima
                  </label>
                  <input
                    id="su-epm"
                    name="emailPoliciaMaritima"
                    type="email"
                    className="form-control"
                    maxLength={120}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-emm">
                    Email Marina Mercante
                  </label>
                  <input
                    id="su-emm"
                    name="emailMarinaMercante"
                    type="email"
                    className="form-control"
                    maxLength={120}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="su-eal">
                    Email Apoyo Logístico
                  </label>
                  <input
                    id="su-eal"
                    name="emailApoyoLogistico"
                    type="email"
                    className="form-control"
                    maxLength={120}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="su-esec">
                    Email Secretaría
                  </label>
                  <input
                    id="su-esec"
                    name="emailSecretaria"
                    type="email"
                    className="form-control"
                    maxLength={120}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="su-her">
                    Heráldica
                  </label>
                  <textarea
                    id="su-her"
                    name="heraldica"
                    className="form-control"
                    rows={5}
                    maxLength={20000}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="su-escudo">
                    Imagen del escudo (PNG)
                  </label>
                  <input
                    id="su-escudo"
                    name="escudo"
                    type="file"
                    className="form-control"
                    accept=".png,image/png"
                  />
                  <div className="form-text">
                    Opcional. Solo PNG; si adjunta, se guardará como SIGLA.png. Si
                    no, en el sistema se usará el escudo PRENA.png por defecto.
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Guardando…" : "Crear unidad"}
                </button>
                <Link
                  className="btn btn-outline-secondary"
                  to="/gestion-unidades"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
