import "../../styles/seafarer-basic-data-table.css";
import {
  displaySeafarerDate,
  displaySeafarerGeneralStatus,
  displaySeafarerText,
} from "../../utils/seafarerDisplay.js";

function Row({ label, value }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  );
}

export function SeafarerBasicDataTable({ seafarer }) {
  if (!seafarer) return null;

  const doc = seafarer.document ?? {};
  const pd = seafarer.personalData ?? {};
  const mf = seafarer.maritimeFitness ?? {};
  const sb = mf.seamanBook ?? {};
  const mc = mf.medicalCertificate ?? {};
  const vc = mf.vaccinationCard ?? {};
  const ct = seafarer.contact ?? {};

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Datos del registro</h5>
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0 align-middle seafarer-basic-data-table">
            <tbody>
              <Row
                label="Documento"
                value={`${displaySeafarerText(doc.type)} — ${displaySeafarerText(doc.number)}`}
              />
              <Row
                label="Nombre y apellido"
                value={`${displaySeafarerText(pd.firstName)} ${displaySeafarerText(pd.lastName)}`}
              />
              <Row
                label="Fecha de nacimiento"
                value={displaySeafarerDate(pd.birthDate)}
              />
              <Row
                label="Nacionalidad"
                value={displaySeafarerText(pd.nationality)}
              />
              <Row label="Género" value={displaySeafarerText(pd.gender)} />
              <Row
                label="Estado general"
                value={displaySeafarerGeneralStatus(seafarer.generalStatus)}
              />
              <Row
                label="Libreta de embarque"
                value={`${displaySeafarerText(sb.number)} · Vto. ${displaySeafarerDate(sb.expirationDate)} · ${displaySeafarerText(sb.status)}`}
              />
              <Row
                label="Carné de salud"
                value={`Vto. ${displaySeafarerDate(mc.expirationDate)} · ${displaySeafarerText(mc.status)}`}
              />
              <Row
                label="Carné de vacunación"
                value={`Vto. ${displaySeafarerDate(vc.expirationDate)} · ${displaySeafarerText(vc.status)}`}
              />
              <Row label="Teléfono" value={displaySeafarerText(ct.phone)} />
              <Row label="Correo" value={displaySeafarerText(ct.email)} />
              <Row label="Domicilio" value={displaySeafarerText(ct.address)} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
