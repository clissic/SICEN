import { Schema, model } from "mongoose";

const coherenceFlagsSchema = new Schema(
  {
    nameMismatch: { type: Boolean, default: false },
    birthDateMismatch: { type: Boolean, default: false },
    phoneMismatch: { type: Boolean, default: false },
    emailMismatch: { type: Boolean, default: false },
  },
  { _id: false }
);

const schema = new Schema(
  {
    type: {
      type: String,
      enum: ["link", "unlink"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    seafarerId: {
      type: Schema.Types.ObjectId,
      ref: "seafarers",
      required: true,
      index: true,
    },
    /** Prefectura elegida (link) o unidad que vinculó (unlink). */
    unitAcronym: { type: String, default: "", trim: true, uppercase: true },
    reason: { type: String, default: "", trim: true, maxlength: 1000 },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: String, default: "", trim: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: "", trim: true },
    coherenceFlags: { type: coherenceFlagsSchema, default: () => ({}) },
    /** Token HMAC del email (sin firma en texto plano del link). */
    emailTokenId: { type: String, default: "", trim: true, index: true },
    /**
     * Documento de identidad adjunto por el náuta (frente cédula / hoja pasaporte).
     * Solo aplica a solicitudes `type: "link"` iniciadas por el skipper.
     */
    identityDocument: {
      type: new Schema(
        {
          storedName: { type: String, default: "", trim: true },
          originalName: { type: String, default: "", trim: true },
          mimeType: { type: String, default: "", trim: true },
          size: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps: true }
);

schema.index(
  { userId: 1, type: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);
schema.index(
  { seafarerId: 1, type: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);

export const SeafarerLinkRequestMongoose = model(
  "seafarerLinkRequests",
  schema
);
