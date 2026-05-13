import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { renameUnitsFilesFolder } from "../services/unitFiles.service.js";
import {
  acronymExists,
  acronymTakenByOther,
  createUnitDocument,
  deleteShieldPngFiles,
  fallbackShieldPublicUrl,
  renameShieldFiles,
  shieldPngFileExists,
  shieldPublicUrl,
  writeShieldPng,
} from "../services/units.service.js";

function normalizeSiglaParam(raw) {
  const sigla = String(raw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(sigla)) return null;
  return sigla;
}

const SIGLA_MSG =
  "La sigla debe tener entre 4 y 6 caracteres (solo letras y números).";

/** `YYYY-MM-DD` del formulario → Date en medianoche UTC (día civil). */
function parseFoundationDateFromForm(fechaRaw) {
  const s = String(fechaRaw ?? "").trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(Date.UTC(y, mo, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeEmails(body) {
  return {
    emailRadio: String(body.emailRadio ?? "").trim().slice(0, 120),
    emailPoliciaMaritima: String(body.emailPoliciaMaritima ?? "")
      .trim()
      .slice(0, 120),
    emailMarinaMercante: String(body.emailMarinaMercante ?? "")
      .trim()
      .slice(0, 120),
    emailApoyoLogistico: String(body.emailApoyoLogistico ?? "")
      .trim()
      .slice(0, 120),
    emailSecretaria: String(body.emailSecretaria ?? "").trim().slice(0, 120),
  };
}

export const unitsController = {
  async list(req, res) {
    try {
      const units = await UnitMongoose.find()
        .select(
          "acronym name address phone foundationDate shieldRelativeUrl emailRadio emailPoliciaMaritima emailMarinaMercante emailApoyoLogistico emailSecretaria"
        )
        .sort({ acronym: 1 })
        .lean();
      return res.json({ ok: true, units });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        msg: e?.message || "Error al listar unidades.",
      });
    }
  },

  async create(req, res) {
    try {
      const siglaRaw = String(req.body.sigla ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9]{4,6}$/.test(siglaRaw)) {
        return res.status(400).json({
          ok: false,
          msg: SIGLA_MSG,
        });
      }

      if (await acronymExists(siglaRaw)) {
        return res.status(409).json({
          ok: false,
          msg: "Ya existe un registro en la base de datos con esa sigla.",
        });
      }

      const name = String(req.body.nombre ?? "").trim();
      if (!name) {
        return res.status(400).json({
          ok: false,
          msg: "El nombre es obligatorio.",
        });
      }

      const address = String(req.body.direccion ?? "").trim().slice(0, 500);
      const phone = String(req.body.telefono ?? "").trim().slice(0, 50);
      const heraldica = String(req.body.heraldica ?? "").trim().slice(0, 20000);

      const fechaRaw = String(req.body.fechaCreacion ?? "").trim();
      const foundationDate = parseFoundationDateFromForm(fechaRaw);
      if (!foundationDate) {
        return res.status(400).json({
          ok: false,
          msg: "Indique una fecha de creación válida.",
        });
      }

      const emails = normalizeEmails(req.body);

      let shieldRelativeUrl;
      if (req.file?.buffer?.length) {
        writeShieldPng(siglaRaw, req.file.buffer);
        shieldRelativeUrl = shieldPublicUrl(siglaRaw);
      } else {
        shieldRelativeUrl = fallbackShieldPublicUrl();
      }

      const created = await createUnitDocument({
        acronym: siglaRaw,
        name: name.slice(0, 200),
        address,
        phone,
        ...emails,
        heraldica,
        foundationDate,
        shieldRelativeUrl,
      });

      return res.status(201).json({
        ok: true,
        msg: "Unidad registrada correctamente.",
        unit: created,
      });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({
          ok: false,
          msg: "Ya existe un registro en la base de datos con esa sigla.",
        });
      }
      return res.status(500).json({
        ok: false,
        msg: e?.message || "Error al registrar la unidad.",
      });
    }
  },

  async getOne(req, res) {
    try {
      const sigla = normalizeSiglaParam(req.params.acronym);
      if (!sigla) {
        return res.status(400).json({
          ok: false,
          msg: "Sigla inválida.",
        });
      }
      const unit = await UnitMongoose.findOne({ acronym: sigla })
        .select(
          "acronym name address phone foundationDate shieldRelativeUrl heraldica emailRadio emailPoliciaMaritima emailMarinaMercante emailApoyoLogistico emailSecretaria"
        )
        .lean();
      if (!unit) {
        return res.status(404).json({ ok: false, msg: "Unidad no encontrada." });
      }
      return res.json({ ok: true, unit });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        msg: e?.message || "Error al obtener la unidad.",
      });
    }
  },

  async update(req, res) {
    try {
      const sigla = normalizeSiglaParam(req.params.acronym);
      if (!sigla) {
        return res.status(400).json({
          ok: false,
          msg: "Sigla inválida.",
        });
      }

      const existing = await UnitMongoose.findOne({ acronym: sigla });
      if (!existing) {
        return res.status(404).json({ ok: false, msg: "Unidad no encontrada." });
      }

      const name = String(req.body.nombre ?? "").trim();
      if (!name) {
        return res.status(400).json({
          ok: false,
          msg: "El nombre es obligatorio.",
        });
      }

      const address = String(req.body.direccion ?? "").trim().slice(0, 500);
      const phone = String(req.body.telefono ?? "").trim().slice(0, 50);
      const heraldica = String(req.body.heraldica ?? "").trim().slice(0, 20000);

      const fechaRaw = String(req.body.fechaCreacion ?? "").trim();
      const foundationDate = parseFoundationDateFromForm(fechaRaw);
      if (!foundationDate) {
        return res.status(400).json({
          ok: false,
          msg: "Indique una fecha de creación válida.",
        });
      }

      const emails = normalizeEmails(req.body);

      const newSigla = String(req.body.sigla ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9]{4,6}$/.test(newSigla)) {
        return res.status(400).json({
          ok: false,
          msg: SIGLA_MSG,
        });
      }

      const acronymChanged = newSigla !== sigla;
      if (
        acronymChanged &&
        (await acronymTakenByOther(newSigla, existing._id))
      ) {
        return res.status(409).json({
          ok: false,
          msg: "Ya existe un registro en la base de datos con esa sigla.",
        });
      }

      const hasNewFile = !!(req.file?.buffer?.length);

      try {
        if (hasNewFile) {
          writeShieldPng(newSigla, req.file.buffer);
          if (acronymChanged) {
            deleteShieldPngFiles(sigla);
          }
        } else if (acronymChanged) {
          renameShieldFiles(sigla, newSigla);
        }
        if (acronymChanged) {
          renameUnitsFilesFolder(sigla, newSigla);
        }
      } catch (diskErr) {
        return res.status(500).json({
          ok: false,
          msg:
            diskErr?.message ||
            "Error al renombrar archivos de la unidad en el servidor.",
        });
      }

      existing.acronym = newSigla;
      existing.name = name.slice(0, 200);
      existing.address = address;
      existing.phone = phone;
      existing.heraldica = heraldica;
      existing.foundationDate = foundationDate;
      existing.shieldRelativeUrl =
        hasNewFile || shieldPngFileExists(newSigla)
          ? shieldPublicUrl(newSigla)
          : fallbackShieldPublicUrl();
      Object.assign(existing, emails);

      try {
        await existing.save();
      } catch (saveErr) {
        if (saveErr?.code === 11000) {
          return res.status(409).json({
            ok: false,
            msg: "Ya existe un registro en la base de datos con esa sigla.",
          });
        }
        throw saveErr;
      }

      if (acronymChanged) {
        await UserMongoose.updateMany(
          {
            unit: new RegExp(
              `^${sigla.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
          { $set: { unit: newSigla } }
        );
      }

      return res.json({
        ok: true,
        msg: acronymChanged
          ? "Unidad actualizada correctamente (sigla, archivos y usuarios asociados)."
          : "Unidad actualizada correctamente.",
        unit: existing.toObject(),
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        msg: e?.message || "Error al actualizar la unidad.",
      });
    }
  },

  async remove(req, res) {
    try {
      const sigla = normalizeSiglaParam(req.params.acronym);
      if (!sigla) {
        return res.status(400).json({
          ok: false,
          msg: "Sigla inválida.",
        });
      }

      const usersCount = await UserMongoose.countDocuments({
        unit: new RegExp(`^${sigla.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      if (usersCount > 0) {
        return res.status(409).json({
          ok: false,
          msg: `Hay ${usersCount} usuario(s) asignados a esta unidad. Reasígnelos antes de borrarla.`,
        });
      }

      const deleted = await UnitMongoose.findOneAndDelete({ acronym: sigla });
      if (!deleted) {
        return res.status(404).json({ ok: false, msg: "Unidad no encontrada." });
      }

      deleteShieldPngFiles(sigla);

      return res.json({
        ok: true,
        msg: "Unidad eliminada correctamente.",
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        msg: e?.message || "Error al eliminar la unidad.",
      });
    }
  },
};
