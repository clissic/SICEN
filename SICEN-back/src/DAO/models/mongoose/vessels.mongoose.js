import { Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const deficiencySchema = new Schema(
  {
    code: { type: String, default: "" },
    description: { type: String, default: "" },
    inspectionDate: { type: String, default: "" },
    status: { type: String, default: "" },
    detainable: { type: Boolean, default: false },
  },
  { _id: false }
);

const detentionSchema = new Schema(
  {
    date: { type: String, default: "" },
    port: { type: String, default: "" },
    authority: { type: String, default: "" },
    reason: { type: String, default: "" },
    releaseDate: { type: String, default: null },
  },
  { _id: false }
);

const schema = new Schema(
  {
    /** Identificador de negocio (único cuando está presente). */
    id: { type: String, trim: true, unique: true, sparse: true },

    vesselType: { type: String, default: "", trim: true },

    /** Documentación deportiva (solo si vesselType es Deportivo). */
    recreationalDocType: { type: String, default: "", trim: true },

    identification: {
      imoNumber: { type: String, default: null },
      nationalRegistryNumber: { type: String, default: null },
      mmsi: { type: String, default: null },
      callSign: { type: String, default: null },
    },

    generalInfo: {
      name: { type: String, default: "", trim: true },
      flagState: { type: String, default: "", trim: true },
      portOfRegistry: { type: String, default: "", trim: true },
      yearBuilt: { type: Number, default: null },
      shipType: { type: String, default: "", trim: true },
      grossTonnage: { type: Number, default: null },
      netTonnage: { type: Number, default: null },
      deadweight: { type: Number, default: null },
      lengthOverall: { type: Number, default: null },
      beam: { type: Number, default: null },
      /** Puntal (solo aplica con sentido en buques deportivos en el alta inicial). */
      puntal: { type: Number, default: null },
      draft: { type: Number, default: null },
    },

    ownership: {
      owner: { type: String, default: "", trim: true },
      operator: { type: String, default: "", trim: true },
      companyAddress: { type: String, default: "", trim: true },
    },

    propulsion: {
      engineType: { type: String, default: "", trim: true },
      enginePowerKW: { type: Number, default: null },
      serviceSpeedKnots: { type: Number, default: null },
    },

    classification: {
      kind: {
        type: String,
        enum: ["", "recognized", "flag"],
        default: "",
        trim: true,
      },
      /** Texto elegido del listado de sociedades (solo si `kind` es recognized). */
      classificationSociety: { type: String, default: "", trim: true },
      /** País del listado de banderas (solo si `kind` es flag). */
      flagRegistryCountry: { type: String, default: "", trim: true },
      navigationArea: { type: String, default: "", trim: true },
    },

    /** Estructura libre hasta definir el tipo de certificado. */
    certificates: { type: [Schema.Types.Mixed], default: [] },

    /** Claves de certificados adicionales (`other_*`) mostrados en la tabla por buque. */
    extraCertificatePresetKeys: { type: [String], default: [] },

    crew: {
      master: { type: String, default: "", trim: true },
      crewCapacity: { type: Number, default: null },
    },

    tracking: {
      lastKnownPosition: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
      },
      lastPort: { type: String, default: "", trim: true },
      nextPort: { type: String, default: "", trim: true },
      eta: { type: String, default: "" },
    },

    portStateControl: {
      hasDeficiencies: { type: Boolean, default: false },
      deficiencies: { type: [deficiencySchema], default: [] },
      detained: { type: Boolean, default: false },
      detentions: { type: [detentionSchema], default: [] },
    },

    legalStatus: {
      hasVesselEmbargo: { type: Boolean, default: false },
      /** Objeto de detalle o `null` si aún no aplica. */
      vesselEmbargoDetails: { type: Schema.Types.Mixed, default: null },
      hasCompanyEmbargo: { type: Boolean, default: false },
      companyEmbargoDetails: { type: Schema.Types.Mixed, default: null },
    },

    status: {
      operationalStatus: { type: String, default: "", trim: true },
      remarks: { type: String, default: null },
    },
  },
  { timestamps: true }
);

schema.plugin(mongoosePaginate);

export const VesselMongoose = model("vessels", schema);
