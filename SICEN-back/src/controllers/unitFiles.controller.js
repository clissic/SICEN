import {
  deleteProcedimientoFile,
  listProcedimientosDivIFiles,
  listProcedimientosDivIIFiles,
  procedimientoPublicUrl,
} from "../services/unitFiles.service.js";

function handleList(req, res, listFn) {
  try {
    const unit = req.unitCode;
    const { error, files } = listFn(unit);
    if (error === "invalid_unit" || error === "invalid_division") {
      return res.status(400).json({ ok: false, msg: "Solicitud no válida." });
    }
    if (error === "path") {
      return res.status(500).json({
        ok: false,
        msg: "Error interno al resolver ruta.",
      });
    }

    return res.json({ ok: true, unit, files });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: e?.message || "Error al listar archivos.",
    });
  }
}

function handleUpload(req, res, divisionDir) {
  try {
    const unit = req.unitCode;
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        msg: "No se recibió ningún archivo.",
      });
    }
    const url = procedimientoPublicUrl(unit, divisionDir, req.file.filename);
    return res.status(201).json({
      ok: true,
      unit,
      file: {
        name: req.file.filename,
        url,
      },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: e?.message || "Error al guardar el archivo.",
    });
  }
}

function handleDelete(req, res, divisionDir) {
  try {
    const unit = req.unitCode;

    const relativePath =
      typeof req.query.relativePath === "string"
        ? req.query.relativePath
        : "";
    const { error } = deleteProcedimientoFile(unit, divisionDir, relativePath);

    if (error === "invalid_unit" || error === "invalid_division") {
      return res.status(400).json({ ok: false, msg: "Solicitud no válida." });
    }
    if (error === "invalid_path") {
      return res.status(400).json({
        ok: false,
        msg: "Ruta del archivo no válida.",
      });
    }
    if (error === "path") {
      return res.status(400).json({ ok: false, msg: "Ruta no permitida." });
    }
    if (error === "not_found") {
      return res.status(404).json({
        ok: false,
        msg: "El archivo ya no existe o fue movido.",
      });
    }
    if (error === "not_file" || error === "invalid_type") {
      return res.status(400).json({
        ok: false,
        msg: "No se puede borrar este elemento.",
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: e?.message || "Error al borrar el archivo.",
    });
  }
}

export const unitFilesController = {
  listProcedimientosDivI(req, res) {
    return handleList(req, res, listProcedimientosDivIFiles);
  },
  listProcedimientosDivII(req, res) {
    return handleList(req, res, listProcedimientosDivIIFiles);
  },
  uploadProcedimientosDivI(req, res) {
    return handleUpload(req, res, "DIV-I");
  },
  uploadProcedimientosDivII(req, res) {
    return handleUpload(req, res, "DIV-II");
  },
  deleteProcedimientosDivI(req, res) {
    return handleDelete(req, res, "DIV-I");
  },
  deleteProcedimientosDivII(req, res) {
    return handleDelete(req, res, "DIV-II");
  },
};
