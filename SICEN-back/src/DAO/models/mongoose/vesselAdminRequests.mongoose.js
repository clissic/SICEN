import { Schema, model } from "mongoose";

const proofDocumentSchema = new Schema(
  {
    storedName: { type: String, default: "", trim: true },
    originalName: { type: String, default: "", trim: true },
    mimeType: { type: String, default: "", trim: true },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const schema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    claimType: {
      type: String,
      enum: ["owner", "admin"],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    vesselId: {
      type: Schema.Types.ObjectId,
      ref: "vessels",
      required: true,
      index: true,
    },
    unitAcronym: { type: String, default: "", trim: true, uppercase: true },
    reason: { type: String, default: "", trim: true, maxlength: 1000 },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: String, default: "", trim: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: "", trim: true },
    emailTokenId: { type: String, default: "", trim: true, index: true },
    proofDocument: { type: proofDocumentSchema, default: null },
  },
  { timestamps: true }
);

schema.index(
  { userId: 1, vesselId: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);
schema.index(
  { vesselId: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);

export const VesselAdminRequestMongoose = model(
  "vesselAdminRequests",
  schema
);
