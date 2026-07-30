import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

/**
 * Inbox por destinatario: un documento por (usuario, dedupeKey).
 * El targeting original queda en audienceType/audienceValue (unit | user).
 */
const schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    /** Cómo se eligió al destinatario al crear. */
    audienceType: {
      type: String,
      enum: ["user", "unit"],
      required: true,
    },
    /** ObjectId de usuario o sigla de unidad (uppercase). */
    audienceValue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: "", trim: true, maxlength: 1000 },
    href: { type: String, default: "", trim: true, maxlength: 300 },
    meta: { type: Schema.Types.Mixed, default: () => ({}) },
    /** Clave de idempotencia por usuario (índice único compuesto). */
    dedupeKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

schema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, readAt: 1, createdAt: -1 });

schema.plugin(mongoosePaginate);

export const NotificationMongoose = model("notifications", schema);
