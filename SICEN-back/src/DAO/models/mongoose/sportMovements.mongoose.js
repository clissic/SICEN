import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const vesselSnapshotSchema = new Schema(
  {
    name: { type: String, default: "", trim: true },
    nationalRegistryNumber: { type: String, default: "", trim: true },
    vesselType: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const skipperSchema = new Schema(
  {
    seafarerId: {
      type: Schema.Types.ObjectId,
      ref: "seafarers",
      default: null,
    },
    documentType: { type: String, default: "DNI", trim: true },
    documentNumber: { type: String, default: "", trim: true },
    fullName: { type: String, default: "", trim: true },
    brevetCategory: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const passengerSchema = new Schema(
  {
    fullName: { type: String, default: "", trim: true },
    documentNumber: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/**
 * Movimiento de buque deportivo entre prefecturas (unidades).
 * `standBy: true` = pendiente de confirmación de salida (válido 24 h).
 * `status: expired` = no confirmado a tiempo.
 * `status: inTransit` = confirmado; visible en ARRIBOS/DEMORADOS según ETA.
 * `status: closed` = caso cerrado por la prefectura destino (arribado o incidente).
 * `status: cancelled` = confirmado anulado por la unidad origen (no se realizó / error).
 */
const schema = new Schema(
  {
    vesselId: {
      type: Schema.Types.ObjectId,
      ref: "vessels",
      required: true,
      index: true,
    },
    vesselSnapshot: { type: vesselSnapshotSchema, default: () => ({}) },

    departureDate: { type: String, default: "", trim: true },
    departureTime: { type: String, default: "", trim: true },
    departurePort: { type: String, default: "", trim: true },
    destinationPort: { type: String, default: "", trim: true },
    eta: { type: Date, default: null, index: true },

    /** Sigla de la unidad que registra el despacho. */
    originUnit: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
      index: true,
    },
    /** Prefectura a informar (unidad de destino). */
    destinationUnit: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
      index: true,
    },
    /** Prefecturas adicionales a informar durante el tránsito. */
    informedUnits: {
      type: [String],
      default: [],
    },

    skipper: { type: skipperSchema, default: () => ({}) },
    passengers: { type: [passengerSchema], default: [] },

    standBy: { type: Boolean, default: true, index: true },
    /**
     * standBy | expired | inTransit | closed | cancelled
     */
    status: {
      type: String,
      enum: ["standBy", "expired", "inTransit", "closed", "cancelled"],
      default: "standBy",
      index: true,
    },
    expiresAt: { type: Date, default: null, index: true },
    confirmedAt: { type: Date, default: null },
    renewedAt: { type: Date, default: null },

    /**
     * Cuándo se materializaron las notificaciones de demora (ETA vencida).
     * null = aún no se notificó a destino / tránsito.
     */
    delayedNotifiedAt: { type: Date, default: null, index: true },

    /**
     * Cierre del caso por la unidad destino.
     * `arrived` → detalle UI "Arribado"
     * `maritimeIncident` → detalle UI "Siniestrado"
     */
    closureOutcome: {
      type: String,
      enum: ["", "arrived", "maritimeIncident"],
      default: "",
    },
    closureNotes: { type: String, default: "", trim: true },
    closedAt: { type: Date, default: null },

    /** Anulación de un confirmado por la unidad origen. */
    cancellationReason: { type: String, default: "", trim: true },
    cancelledAt: { type: Date, default: null },

    metadata: {
      createdBy: { type: String, default: "" },
      lastModifiedBy: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

schema.plugin(mongoosePaginate);

export const SportMovementMongoose = model("sportMovements", schema);
