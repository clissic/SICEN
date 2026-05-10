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
 * Base URL para assets servidos en correos (`{emailAssetsBaseUrl}/img/Logo-PNN.png`).
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
};