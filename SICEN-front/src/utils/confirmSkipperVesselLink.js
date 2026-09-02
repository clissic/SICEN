import Swal from "sweetalert2";
import { escapeHtml } from "./confirmDelete.js";
import { formatSkipperLabel } from "../utils/skipperUserLabel.js";

/**
 * Confirma el vínculo de un náuta con un buque deportivo.
 * @param {{ user: object, roleLabel: string }} options
 * @returns {Promise<boolean>}
 */
export async function confirmSkipperVesselLink({ user, roleLabel }) {
  const name = formatSkipperLabel(user);
  const email = String(user?.email ?? "").trim();
  const role = escapeHtml(String(roleLabel || "náuta").trim() || "náuta");

  const result = await Swal.fire({
    title: "¿Confirmar registro?",
    html: `<div class="text-start">
      <p class="mb-2">¿Registrar a <strong>${escapeHtml(name)}</strong>${
        email ? ` <span class="text-muted">(${escapeHtml(email)})</span>` : ""
      } en calidad de <strong>${role}</strong>?</p>
    </div>`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, confirmar",
    cancelButtonText: "Cancelar",
    focusCancel: true,
  });

  return Boolean(result.isConfirmed);
}
