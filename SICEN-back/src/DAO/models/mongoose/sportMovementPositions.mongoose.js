import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    movementId: {
      type: Schema.Types.ObjectId,
      ref: "sportMovements",
      required: true,
      index: true,
    },
    vesselId: {
      type: Schema.Types.ObjectId,
      ref: "vessels",
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    positionTimestamp: { type: Date, required: true, index: true },
    receivedAt: { type: Date, required: true, default: Date.now, index: true },
    source: {
      type: String,
      enum: ["browser", "android", "ios", "other"],
      default: "browser",
      trim: true,
    },
    movementStatusAtReceive: { type: String, default: "", trim: true },
    speed: { type: Number, default: null },
    heading: { type: Number, default: null },
    altitude: { type: Number, default: null },
    batteryLevel: { type: Number, default: null },
  },
  { timestamps: false }
);

schema.index({ movementId: 1, positionTimestamp: 1 });
schema.index({ movementId: 1, receivedAt: -1 });

export const SportMovementPositionMongoose = model(
  "sportMovementPositions",
  schema
);
