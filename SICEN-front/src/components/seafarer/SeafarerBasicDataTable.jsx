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

function MiniTable({ children }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered mb-0 align-middle seafarer-basic-data-table">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function displayBloodType(bloodType) {
  if (!bloodType || typeof bloodType !== "object") return "—";
  const g = String(bloodType.group ?? "").trim();
  const rh = String(bloodType.rhFactor ?? "").trim();
  if (!g && !rh) return "—";
  return `${g || "—"}${rh || ""}`;
}

export function SeafarerBasicDataTable({ seafarer, onEdit }) {
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

  const rows = [
    <Row
      key="identification"
      label="Identificación"
      value={formatSeafarerIdentification(seafarer)}
    />,
    <Row
      key="firstName"
      label="Nombres"
      value={displaySeafarerText(pd.firstName)}
    />,
    <Row
      key="lastName"
      label="Apellidos"
      value={displaySeafarerText(pd.lastName)}
    />,
    <Row
      key="birthDate"
      label="Fecha de nacimiento"
      value={displaySeafarerDate(pd.birthDate)}
    />,
    <Row
      key="nationality"
      label="Nacionalidad"
      value={displaySeafarerText(pd.nationality)}
    />,
    <Row key="gender" label="Género" value={displaySeafarerText(pd.gender)} />,
    <Row
      key="bloodType"
      label="Tipo de sangre"
      value={displayBloodType(pd.bloodType)}
    />,
    <Row
      key="status"
      label="Estado general"
      value={displaySeafarerGeneralStatus(seafarer.generalStatus)}
    />,
    <Row
      key="hairColor"
      label="Color de cabello"
      value={displaySeafarerHairColor(morph)}
    />,
    <Row
      key="hairColoration"
      label="Coloración"
      value={displaySeafarerHairColoration(morph.hairColoration)}
    />,
    <Row
      key="eyeColor"
      label="Color de ojos"
      value={displaySeafarerText(morph.eyeColor)}
    />,
    <Row
      key="skinColor"
      label="Color de cutis"
      value={displaySeafarerText(morph.skinColor)}
    />,
    <Row key="height" label="Altura" value={height} />,
    <Row
      key="medical"
      label="Carné de salud"
      value={`Vto. ${displaySeafarerDate(mc.expirationDate)} · ${displaySeafarerText(mc.status)}`}
    />,
    <Row
      key="vaccination"
      label="Carné de vacunación"
      value={`Vto. ${displaySeafarerDate(vc.expirationDate)} · ${displaySeafarerText(vc.status)}`}
    />,
    <Row key="phone" label="Teléfono" value={displaySeafarerText(ct.phone)} />,
    <Row key="email" label="Correo" value={displaySeafarerText(ct.email)} />,
    <Row key="address" label="Domicilio" value={displaySeafarerText(ct.address)} />,
  ];

  const firstHalf = rows.slice(0, 9);
  const secondHalf = rows.slice(9);

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Datos del registro</h5>

        <div className="d-none d-lg-block">
          <div className="row g-3">
            <div className="col-lg-6">
              <MiniTable>{firstHalf}</MiniTable>
            </div>
            <div className="col-lg-6">
              <MiniTable>{secondHalf}</MiniTable>
            </div>
          </div>
        </div>

        <div className="d-lg-none">
          <MiniTable>{rows}</MiniTable>
        </div>

        {onEdit ? (
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onEdit}
            >
              Modificar datos
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
