import multer from "multer";

const MAX_BYTES = 1024 * 1024 * 1024;

export const unitShieldUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(req, file, cb) {
    const name = (file.originalname || "").toLowerCase();
    const okMime =
      file.mimetype === "image/png" ||
      file.mimetype === "application/octet-stream";
    const okExt = name.endsWith(".png");
    if (okMime && okExt) {
      cb(null, true);
      return;
    }
    cb(new Error("El escudo debe ser un archivo PNG (.png)."));
  },
}).single("escudo");
