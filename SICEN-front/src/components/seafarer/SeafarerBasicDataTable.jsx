import "../../styles/seafarer-basic-data-table.css";
import {
  displaySeafarerHairColor,
  displaySeafarerHairColoration,
  formatSeafarerIdentification,
} from "../../constants/seafarerCreateForm.js";
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

function displayBloodType(bloodType) {
  if (!bloodType || typeof bloodType !== "object") return "—";
  const g = String(bloodType.group ?? "").trim();
  const rh = String(bloodType.rhFactor ?? "").trim();
  if (!g && !rh) return "—";
  return `${g || "—"}${rh || ""}`;
}

export function SeafarerBasicDataTable({ seafarer }) {
  if (!seafarer) return null;

  const pd = seafarer.personalData ?? {};
  const morph = seafarer.morphologicalData ?? {};
  const mf = seafarer.maritimeFitness ?? {};
  const mc = mf.medicalCertificate ?? {};
  const vc = mf.vaccinationCard ?? {};
  const ct = seafarer.contact ?? {};

  const height =
    morph.heightCm != null && Number.isFinite(Number(morph.heightCm))
      ? `${Math.round(Number(morph.heightCm))} cm`
      : "—";

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Datos del registro</h5>
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0 align-middle seafarer-basic-data-table">
            <tbody>
              <Row
                label="Identificación"
                value={formatSeafarerIdentification(seafarer)}
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
                label="Tipo de sangre"
                value={displayBloodType(pd.bloodType)}
              />
              <Row
                label="Estado general"
                value={displaySeafarerGeneralStatus(seafarer.generalStatus)}
              />
              <Row
                label="Color de cabello"
                value={displaySeafarerHairColor(morph)}
              />
              <Row
                label="Coloración"
                value={displaySeafarerHairColoration(morph.hairColoration)}
              />
              <Row
                label="Color de ojos"
                value={displaySeafarerText(morph.eyeColor)}
              />
              <Row
                label="Color de cutis"
                value={displaySeafarerText(morph.skinColor)}
              />
              <Row label="Altura" value={height} />
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
