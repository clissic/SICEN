/** Tipos de cuenta solicitables (paso 1 del wizard). */
export const NEW_ACCOUNT_TYPES = [
  {
    id: "pnn-funcionario",
    label: "Funcionario de la Prefectura Nacional Naval",
    description: "Personal de la PNN que necesita acceso operativo.",
    icon: "bi-shield-check",
    available: true,
  },
  {
    id: "agente-maritimo",
    label: "Agente Marítimo",
    description: "Próximamente.",
    icon: "bi-briefcase",
    available: false,
  },
  {
    id: "nauta-deportivo",
    label: "Náuta deportivo",
    description: "Titulares de brevet o embarcaciones de recreo.",
    icon: "bi-water",
    available: true,
  },
  {
    id: "gente-de-mar",
    label: "Gente de mar",
    description: "Próximamente.",
    icon: "bi-person-badge",
    available: false,
  },
];

export const NEW_ACCOUNT_WIZARD_STEPS = [
  { id: 1, label: "Tipo de cuenta" },
  { id: 2, label: "Datos" },
  { id: 3, label: "Confirmación" },
];

export function newAccountTypeLabel(id) {
  return (
    NEW_ACCOUNT_TYPES.find((t) => t.id === id)?.label ?? "Solicitud de cuenta"
  );
}

export function isPnnAccountType(id) {
  return id === "pnn-funcionario";
}

export function isNautaAccountType(id) {
  return id === "nauta-deportivo";
}
