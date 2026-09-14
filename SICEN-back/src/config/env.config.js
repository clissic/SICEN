import { Command } from 'commander';
import dotenv from 'dotenv';

const program = new Command();
program.option('--mode <mode>', 'Work mode', 'DEVELOPMENT');
program.parse();

const workMode = program.opts().mode;

dotenv.config({
  path: workMode === 'DEVELOPMENT' ? './.env.development' : './.env.production',
});

const jwtSecretFromEnv = process.env.JWT_SECRET;
if (workMode === 'PRODUCTION' && !jwtSecretFromEnv) {
  console.error(
    "[SICEN-back] JWT_SECRET es obligatorio en producción (.env.production)."
  );
  process.exit(1);
}
const jwtSecret =
  jwtSecretFromEnv ||
  "dev-insecure-jwt-secret-cambiar-en-produccion-min-32-chars!";

function stripTrailingSlash(url) {
  if (!url || typeof url !== "string") return "";
  return url.replace(/\/+$/, "");
}

const port = process.env.PORT || "3000";

/** URL pública de la app (SPA + API en el mismo host). Emails de recuperación enlazan aquí. */
const publicAppUrl = stripTrailingSlash(
  process.env.PUBLIC_APP_URL ||
    process.env.API_URL ||
    `http://localhost:${port}`
);

/**
 * Base URL para assets servidos en correos (`{emailAssetsBaseUrl}/img/Logo-PNN-Blanco.png`).
 * Definí `EMAIL_LOGO_BASE_URL` si el logo debe resolverse desde otro origen (CDN/subdominio).
 * Si está vacío, usa la misma base que la app (`PUBLIC_APP_URL` / `API_URL` / localhost).
 */
const emailAssetsBaseUrl =
  stripTrailingSlash(process.env.EMAIL_LOGO_BASE_URL || "") || publicAppUrl;

export default {
  port: process.env.PORT,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  mongoPassword: process.env.MONGODB_PASSWORD,
  githubSecret: process.env.GITHUB_LOGIN_SECRET,
  persistence: process.env.PERSISTENCE,
  googleEmail: process.env.GOOGLE_EMAIL,
  googlePass: process.env.GOOGLE_PASS,
  twilioSID: process.env.TWILIO_ACCOUNT_SID,
  twilioToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  loggerEnv: process.env.LOGGER_ENV,
  apiUrl: process.env.API_URL,
  publicAppUrl,
  emailAssetsBaseUrl,
  /** API key de https://aisstream.io (capa AIS de El Centinela). Vacío = capa deshabilitada. */
  aisStreamApiKey: process.env.AIS_STREAM_API_KEY || "",
  /** Bounding box AIS: latMin,lonMin,latMax,lonMax (default Río de la Plata; AISStream cubre poco MVD). */
  aisBbox: process.env.AIS_BBOX || "",
  /**
   * Bounding box Skylight (detecciones / frames / AOIs): latMin,lonMin,latMax,lonMax.
   * Si está vacío, usa AIS_BBOX y luego el default amplio (Uruguay + Río de la Plata / Atlántico).
   */
  skylightBbox: process.env.SKYLIGHT_BBOX || "",
  /** API key Skylight (detecciones satelitales / IUU). Vacío = capas Skylight deshabilitadas. */
  skylightApiKey: process.env.SKYLIGHT_API_KEY || "",
  /** TTL cache proxy Skylight (ms). Default 5 min. */
  skylightCacheTtlMs: Number(process.env.SKYLIGHT_CACHE_TTL_MS) || 300_000,
  /**
   * Token Bearer Global Fishing Watch (identidad MMSI→OMI en capa AIS).
   * Uso no comercial. Vacío = enriquecimiento GFW deshabilitado.
   * https://globalfishingwatch.org/our-apis/
   */
  gfwApiToken: process.env.GFW_API_TOKEN || "",
  /** TTL cache identidad GFW (ms). Default 7 días. */
  gfwIdentityCacheTtlMs:
    Number(process.env.GFW_IDENTITY_CACHE_TTL_MS) || 604_800_000,
  /** TTL cache eventos GFW (ms). Default 5 min. */
  gfwEventsCacheTtlMs: Number(process.env.GFW_EVENTS_CACHE_TTL_MS) || 300_000,
  /**
   * Bounding box FIU LAC IUU: latMin,lonMin,latMax,lonMax.
   * Si vacío → AIS_BBOX → default LAC amplio.
   */
  fiuIuuBbox: process.env.FIU_IUU_BBOX || "",
  /** TTL cache proxy FIU IUU (ms). Default 5 min. */
  fiuIuuCacheTtlMs: Number(process.env.FIU_IUU_CACHE_TTL_MS) || 300_000,
  /** TTL cache proxy viento Open-Meteo (ms). Default 10 min. */
  windCacheTtlMs: Number(process.env.WIND_CACHE_TTL_MS) || 600_000,
  /** TTL cache proxy corrientes Open-Meteo Marine (ms). Default 10 min. */
  currentsCacheTtlMs: Number(process.env.CURRENTS_CACHE_TTL_MS) || 600_000,
  /** TTL cache proxy oleaje Open-Meteo Marine (ms). Default 10 min. */
  wavesCacheTtlMs: Number(process.env.WAVES_CACHE_TTL_MS) || 600_000,
  /** TTL cache batimetría GEBCO (ms). Default 7 días (dato estático). */
  bathymetryCacheTtlMs:
    Number(process.env.BATHYMETRY_CACHE_TTL_MS) || 604_800_000,
  /** TTL cache límites marítimos MarineRegions (ms). Default 7 días. */
  maritimeBoundariesCacheTtlMs:
    Number(process.env.MARITIME_BOUNDARIES_CACHE_TTL_MS) || 604_800_000,
  /**
   * Simulador HC (SICEN-sim). Requiere worker Python en HC_SIM_URL.
   * HC_SIM_ENABLED=true|1 para habilitar.
   */
  hcSimEnabled: /^(1|true|yes)$/i.test(
    String(process.env.HC_SIM_ENABLED || "").trim()
  ),
  hcSimUrl: process.env.HC_SIM_URL || "http://127.0.0.1:8091",
  /** Timeout llamada a SICEN-sim (ms). Default 120 s. */
  hcSimTimeoutMs: Number(process.env.HC_SIM_TIMEOUT_MS) || 120_000,
  /**
   * Simulador SAR (mismo worker HC_SIM_URL).
   * SAR_SIM_ENABLED=true|1 para habilitar.
   */
  sarSimEnabled: /^(1|true|yes)$/i.test(
    String(process.env.SAR_SIM_ENABLED || "").trim()
  ),
};