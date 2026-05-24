import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

/**
 * Deficiencia detectada durante una inspección de buque.
 * Estructura alineada con la nomenclatura usada por el CIALA.
 */
const deficiencySchema = new Schema(
  {
    /** Código del rubro de deficiencia (CIALA / IMO). */
    code: { type: String, default: "", trim: true },
    /** Nombre o descripción corta. */
    name: { type: String, default: "", trim: true },
    /** Regla/normativa de referencia. */
    rule: { type: String, default: "", trim: true },
    /**
     * Acciones tomadas (códigos numéricos según tabla del Acuerdo
     * Latinoamericano).
     */
    actionsTaken: { type: [Number], default: [] },
    /** True si la deficiencia está vinculada al Código IGS / ISM Code. */
    ISMrelated: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Inspección de un buque en un puerto nacional. La identidad del buque vive
 * en la colección `vessels`; aquí solo se guarda la referencia (`vesselId`).
 */
const schema = new Schema(
  {
    /** Referencia al buque en la colección `vessels`. */
    vesselId: {
      type: Schema.Types.ObjectId,
      ref: "vessels",
      required: true,
      index: true,
    },
    /**
     * Fecha de ingreso del buque al puerto. Puede quedar en `null` cuando el
     * registro nace como placeholder automático (ej. al crear un buque de
     * Ultramar) y todavía no se cargó la inspección real.
     */
    arrivalDate: { type: Date, default: null },
    /**
     * Fecha en que efectivamente se realizó la inspección. Suele coincidir
     * con `arrivalDate` pero puede diferir si la diligencia se hizo días
     * después del arribo. Queda en `null` mientras `inspectionPerformed`
     * sea `false` o el registro sea un placeholder pendiente.
     */
    inspectionDate: { type: Date, default: null },
    /**
     * Puerto de ingreso (nombre libre, se guarda en mayúsculas). Permite
     * cadena vacía mientras el registro sea un placeholder pendiente.
     */
    arrivalPort: { type: String, default: "", trim: true },
    /** Prioridad CIALA al ingreso (texto libre: I/II/III, alta/media/baja, etc.). */
    cialaPriority: { type: String, default: "", trim: true },
    /** Si se le realizó inspección o no. */
    inspectionPerformed: { type: Boolean, default: false },
    /**
     * URL pública del PDF de la inspección, servido bajo
     * `/uploads/inspectionsERP/<inspectionId>.pdf`. Se persiste el path web
     * (no la ruta absoluta del disco) para que la BD sea portable entre
     * entornos. El archivo físico vive en `SICEN-back/storage/inspectionsERP/`
     * y se sube a través del middleware `uploadInspectionPdf` (multipart).
     */
    inspectionPDF: { type: String, default: "", trim: true },
    /** Deficiencias detectadas durante la inspección. */
    deficiencies: { type: [deficiencySchema], default: [] },
    /**
     * Emails de los inspectores que participaron de la diligencia (lowercase).
     * Se agrega automáticamente el email del usuario que pasa el registro a
     * `inspectionPerformed: true` desde `InspectionCompletionModal`. Soporta
     * más de un inspector por si se necesita registrar inspecciones a cuatro
     * manos. El front muestra el nombre humano resolviendo cada email contra
     * la colección `users`.
     */
    inspectors: { type: [String], default: [] },

    metadata: {
      createdBy: { type: String, default: "" },
      lastModifiedBy: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

schema.plugin(mongoosePaginate);

export const VesselInspectionMongoose = model("vesselInspections", schema);
