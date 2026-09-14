/**
 * Convierte grados decimales a grados, minutos y segundos de arco (DMS).
 */
export function decimalToDms(value) {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { degrees, minutes, seconds };
}

/** Cifras de grados: lat 2 (00–90), lng 3 (000–180). */
export function dmsDegreeDigitCount(kind) {
  return kind === "lat" ? 2 : 3;
}

/** Máx. dígitos: grados + MM + SS + décima. */
export function dmsMaxDigitCount(kind) {
  return dmsDegreeDigitCount(kind) + 2 + 2 + 1;
}

/**
 * Partes tipadas (dígitos + hemi) a partir de un decimal.
 * @param {number} value
 * @param {"lat"|"lng"} kind
 * @returns {{ digits: string, hemi: string }}
 */
export function decimalToDmsInputParts(value, kind) {
  if (!Number.isFinite(value)) {
    return {
      digits: "",
      hemi: kind === "lat" ? "S" : "O",
    };
  }
  const { degrees, minutes, seconds } = decimalToDms(value);
  const degLen = dmsDegreeDigitCount(kind);
  let secWhole = Math.floor(seconds);
  let tenth = Math.round((seconds - secWhole) * 10);
  if (tenth >= 10) {
    tenth = 0;
    secWhole += 1;
  }
  let min = minutes;
  let deg = degrees;
  if (secWhole >= 60) {
    secWhole = 0;
    min += 1;
  }
  if (min >= 60) {
    min = 0;
    deg += 1;
  }
  const digits =
    String(deg).padStart(degLen, "0") +
    String(min).padStart(2, "0") +
    String(secWhole).padStart(2, "0") +
    String(tenth);
  const hemi =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "O";
  return { digits, hemi };
}

/**
 * @param {number} value Latitud o longitud en grados decimales
 * @param {"lat"|"lng"} kind
 * @returns {string} Ej. `34° 54′ 04.2″ S` / `056° 11′ 24.4″ O`
 */
export function formatCoordDms(value, kind) {
  if (!Number.isFinite(value)) return "—";
  const { degrees, minutes, seconds } = decimalToDms(value);
  const hemi =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "O";
  const degLen = dmsDegreeDigitCount(kind);
  const degStr = String(degrees).padStart(degLen, "0");
  const minStr = String(minutes).padStart(2, "0");
  const secStr = seconds.toFixed(1).padStart(4, "0");
  return `${degStr}° ${minStr}′ ${secStr}″ ${hemi}`;
}

/**
 * Formatea dígitos progresivos a DMS visible (sin hemisferio).
 * Lat: GG MM SS.d — Lng: GGG MM SS.d (grados con ceros a la izquierda).
 */
export function formatDmsDigitsInput(digits, kind) {
  const degLen = dmsDegreeDigitCount(kind);
  const clean = String(digits || "")
    .replace(/\D/g, "")
    .slice(0, dmsMaxDigitCount(kind));
  if (!clean) return "";

  // Grados incompletos: sin ceros a la izquierda (si no, al seguir tipando
  // esos ceros se vuelven dígitos y salta a minutos de golpe).
  if (clean.length < degLen) {
    return `${clean}°`;
  }

  const deg = clean.slice(0, degLen).padStart(degLen, "0");
  if (clean.length === degLen) {
    return `${deg}°`;
  }

  let out = `${deg}°`;
  const rest = clean.slice(degLen);

  if (rest.length <= 2) {
    const min = rest.length === 2 ? rest.padStart(2, "0") : rest;
    return `${out} ${min}′`;
  }

  const min = rest.slice(0, 2);
  out += ` ${min}′`;
  const secPart = rest.slice(2);
  if (secPart.length === 1) return `${out} ${secPart}″`;
  if (secPart.length === 2) return `${out} ${secPart}″`;
  return `${out} ${secPart.slice(0, 2)}.${secPart.slice(2, 3)}″`;
}

/**
 * Convierte dígitos DMS + hemisferio a grados decimales.
 * Requiere al menos grados+minutos+segundos enteros; la décima es opcional.
 * @returns {number|null}
 */
export function parseDmsDigits(digits, kind, hemi) {
  const degLen = dmsDegreeDigitCount(kind);
  const clean = String(digits || "").replace(/\D/g, "");
  if (clean.length < degLen + 4) return null;

  const deg = Number(clean.slice(0, degLen));
  const min = Number(clean.slice(degLen, degLen + 2));
  const secWhole = Number(clean.slice(degLen + 2, degLen + 4));
  const tenth =
    clean.length > degLen + 4
      ? Number(clean.slice(degLen + 4, degLen + 5))
      : 0;

  if (
    !Number.isFinite(deg) ||
    !Number.isFinite(min) ||
    !Number.isFinite(secWhole) ||
    !Number.isFinite(tenth)
  ) {
    return null;
  }
  if (min >= 60 || secWhole >= 60 || tenth > 9) return null;

  const hemiU = String(hemi || "").toUpperCase();
  if (kind === "lat") {
    if (hemiU !== "N" && hemiU !== "S") return null;
    if (deg > 90) return null;
  } else {
    if (hemiU !== "E" && hemiU !== "O" && hemiU !== "W") return null;
    if (deg > 180) return null;
  }

  let decimal = deg + min / 60 + (secWhole + tenth / 10) / 3600;
  if (kind === "lat") {
    if (hemiU === "S") decimal = -decimal;
    if (decimal < -90 || decimal > 90) return null;
  } else {
    if (hemiU === "O" || hemiU === "W") decimal = -decimal;
    if (decimal < -180 || decimal > 180) return null;
  }
  return decimal;
}

/**
 * Parsea texto DMS a grados decimales.
 * Acepta p. ej. `34° 53′ 43.4″ S`, `34 53 43.4 S`, `56°11'24.4"O`.
 * @param {string} text
 * @param {"lat"|"lng"} kind
 * @returns {number|null}
 */
export function parseCoordDms(text, kind) {
  if (typeof text !== "string") return null;
  const normalized = text
    .trim()
    .replace(/,/g, ".")
    .replace(/[º°]/g, "°")
    .replace(/[′'´]/g, "'")
    .replace(/[″"〞]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const m = normalized.match(
    /^(\d{1,3})\s*°?\s*(\d{1,2})\s*'?\s*(\d{1,2}(?:\.\d+)?)\s*"?\s*([NnSsEeOoWw])\s*$/
  );
  if (!m) return null;

  const deg = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const hemi = m[4].toUpperCase();
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) {
    return null;
  }
  if (min >= 60 || sec >= 60) return null;

  if (kind === "lat") {
    if (hemi !== "N" && hemi !== "S") return null;
    if (deg > 90) return null;
  } else {
    if (hemi !== "E" && hemi !== "O" && hemi !== "W") return null;
    if (deg > 180) return null;
  }

  let decimal = deg + min / 60 + sec / 3600;
  if (kind === "lat") {
    if (hemi === "S") decimal = -decimal;
    if (decimal < -90 || decimal > 90) return null;
  } else {
    if (hemi === "O" || hemi === "W") decimal = -decimal;
    if (decimal < -180 || decimal > 180) return null;
  }
  return decimal;
}

/**
 * Etiqueta legible para par lat/lng en UI o textos planos.
 */
export function formatCoordPairLabel(lat, lng) {
  const latDms = formatCoordDms(lat, "lat");
  const lngDms = formatCoordDms(lng, "lng");
  if (latDms === "—" && lngDms === "—") return "";
  return `Lat. ${latDms} · Long. ${lngDms}`;
}
