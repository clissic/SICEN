import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    movementId: {
      type: Schema.Types.ObjectId,
      ref: "sportMovements",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["normal", "warning", "critical"],
      default: "normal",
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ movementId: 1, createdAt: -1 });

export const SportMovementTrackingAlertMongoose = model(
  "sportMovementTrackingAlerts",
  schema
);
