import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import {
  MFA_LOCK_MS,
  MFA_MAX_FAILED_ATTEMPTS,
  roleRequiresMfa,
} from "../constants/mfa.js";
import { logger } from "../utils/logger.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { toPublicUser } from "../middlewares/auth.js";
import { mergeUserStatesFromDocument } from "../constants/userStates.js";
import {
  buildOtpauthUrl,
  generateTotpSecret,
  verifyTotp,
} from "../utils/totp.util.js";
import { decryptTotpSecret, encryptTotpSecret } from "../utils/mfaCrypto.util.js";
import {
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  hashRecoveryCodes,
  looksLikeRecoveryCode,
} from "../utils/recoveryCodes.util.js";
import { otpauthToDataUrl } from "../utils/mfaQr.util.js";
import { signMfaChallengeToken } from "../utils/mfaJwt.util.js";

function httpError(msg, status = 400, code) {
  const e = new Error(msg);
  e.status = status;
  if (code) e.code = code;
  return e;
}

function mfaState(user) {
  return user?.mfa && typeof user.mfa === "object" ? user.mfa : {};
}

export function userHasMfaEnabled(user) {
  return mfaState(user).enabled === true;
}

export function loginRequiresMfaChallenge(user) {
  return roleRequiresMfa(user?.role) || userHasMfaEnabled(user);
}

export function publicUserShape(user) {
  if (!user) return null;
  const u = toPublicUser(user);
  return {
    _id: u._id,
    avatar: u.avatar,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    rank: u.rank,
    unit: u.unit ?? "",
    role: u.role,
    fines: u.fines ?? [],
    states: mergeUserStatesFromDocument(u.states),
    userTutorial: u.userTutorial === true,
    mfaEnabled: u.mfaEnabled === true,
  };
}

function issueAccessToken(user) {
  // Compatible con PR #12: hoy el JWT solo lleva `sub`. Si ese PR mergea
  // primero y `signAccessToken` acepta tokenVersion, hay que pasarlo acá.
  return signAccessToken(user._id);
}

function ensureMfaSubdoc(user) {
  if (!user.mfa || typeof user.mfa !== "object") {
    user.mfa = {};
  }
  return user.mfa;
}

function remainingLockMs(user) {
  const until = mfaState(user).lockUntil;
  if (!until) return 0;
  const ms = new Date(until).getTime() - Date.now();
  return ms > 0 ? ms : 0;
}

export function assertMfaNotLocked(user) {
  const remain = remainingLockMs(user);
  if (remain <= 0) return;
  const minutes = Math.max(1, Math.ceil(remain / 60000));
  throw httpError(
    `Demasiados intentos fallidos. Probá de nuevo en ${minutes} min.`,
    429,
    "MFA_LOCKED"
  );
}

async function registerFailedAttempt(user) {
  const mfa = ensureMfaSubdoc(user);
  const prev = Number(mfa.failedAttempts) || 0;
  const next = prev + 1;
  mfa.failedAttempts = next;
  if (next >= MFA_MAX_FAILED_ATTEMPTS) {
    mfa.lockUntil = new Date(Date.now() + MFA_LOCK_MS);
    logger.warning(
      `MFA lockout · email=${user.email} · intentos=${next}`
    );
  }
  user.markModified?.("mfa");
  await user.save();
}

async function resetFailedAttempts(user) {
  const mfa = ensureMfaSubdoc(user);
  if (!mfa.failedAttempts && !mfa.lockUntil) return;
  mfa.failedAttempts = 0;
  mfa.lockUntil = null;
  user.markModified?.("mfa");
  await user.save();
}

function decryptUserSecret(user, field) {
  const enc = mfaState(user)[field];
  if (!enc) return "";
  try {
    return decryptTotpSecret(enc);
  } catch (e) {
    logger.error("No se pudo descifrar el secreto MFA: " + (e?.message || e));
    throw httpError(
      "No se pudo leer la configuración de verificación en dos pasos.",
      500
    );
  }
}

export async function buildMfaChallengeResponse(user) {
  const enrolled = userHasMfaEnabled(user);
  logger.info(
    `${user.rank} ${user.first_name} ${user.last_name} login MFA pendiente (${user.role})`
  );
  return {
    ok: true,
    mfaRequired: true,
    mfaEnrollmentRequired: !enrolled,
    mfaToken: signMfaChallengeToken(user._id),
  };
}

export async function startEnrollment(user, { currentCode } = {}) {
  if (!roleRequiresMfa(user.role) && !userHasMfaEnabled(user)) {
    throw httpError(
      "La verificación en dos pasos solo está disponible para administradores.",
      403
    );
  }
  assertMfaNotLocked(user);

  if (userHasMfaEnabled(user)) {
    const currentSecret = decryptUserSecret(user, "secretEncrypted");
    if (!currentCode) {
      throw httpError(
        "Ingresá el código actual de la app para renovar la configuración.",
        400,
        "MFA_CURRENT_CODE_REQUIRED"
      );
    }
    if (!verifyTotp(currentSecret, currentCode) && !consumeRecoveryIfMatch(user, currentCode, { persist: false })) {
      await registerFailedAttempt(user);
      throw httpError("El código es incorrecto o venció.", 401, "MFA_INVALID");
    }
  }

  const secret = generateTotpSecret();
  const recoveryCodes = generateRecoveryCodes();
  const mfa = ensureMfaSubdoc(user);
  mfa.pendingSecretEncrypted = encryptTotpSecret(secret);
  mfa.pendingRecoveryCodeHashes = hashRecoveryCodes(recoveryCodes);
  user.markModified?.("mfa");
  await user.save();

  const otpauthUrl = buildOtpauthUrl({ secret, email: user.email });
  const qrDataUrl = await otpauthToDataUrl(otpauthUrl);
  logger.info(`MFA enroll iniciado · email=${user.email}`);
  return {
    otpauthUrl,
    qrDataUrl,
    secret,
    recoveryCodes,
    issuer: "SICEN",
  };
}

function consumeRecoveryIfMatch(user, code, { persist = true } = {}) {
  if (!looksLikeRecoveryCode(code)) return false;
  const hashes = mfaState(user).recoveryCodeHashes || [];
  const idx = findRecoveryCodeIndex(code, hashes);
  if (idx < 0) return false;
  if (persist) {
    const next = hashes.slice();
    next.splice(idx, 1);
    ensureMfaSubdoc(user).recoveryCodeHashes = next;
    user.markModified?.("mfa");
  }
  return true;
}

function pendingRecoveryIfMatch(user, code) {
  if (!looksLikeRecoveryCode(code)) return false;
  const hashes = mfaState(user).pendingRecoveryCodeHashes || [];
  return findRecoveryCodeIndex(code, hashes) >= 0;
}

async function confirmPendingEnrollment(user, code) {
  const pendingSecret = decryptUserSecret(user, "pendingSecretEncrypted");
  if (!pendingSecret) {
    throw httpError(
      "No hay una configuración pendiente. Generá el código QR de nuevo.",
      400,
      "MFA_NO_PENDING"
    );
  }
  const totpOk = verifyTotp(pendingSecret, code);
  const recoveryOk = pendingRecoveryIfMatch(user, code);
  if (!totpOk && !recoveryOk) {
    await registerFailedAttempt(user);
    throw httpError("El código es incorrecto o venció.", 401, "MFA_INVALID");
  }
  const mfa = ensureMfaSubdoc(user);
  mfa.enabled = true;
  mfa.secretEncrypted = mfa.pendingSecretEncrypted;
  mfa.recoveryCodeHashes = mfa.pendingRecoveryCodeHashes || [];
  mfa.pendingSecretEncrypted = "";
  mfa.pendingRecoveryCodeHashes = [];
  mfa.failedAttempts = 0;
  mfa.lockUntil = null;
  user.markModified?.("mfa");
  await user.save();
  logger.info(`MFA activado · email=${user.email}`);
}

async function verifyEnabledMfa(user, code) {
  const secret = decryptUserSecret(user, "secretEncrypted");
  if (!secret) {
    throw httpError(
      "La verificación en dos pasos no está configurada.",
      400,
      "MFA_NOT_ENABLED"
    );
  }
  const totpOk = verifyTotp(secret, code);
  const recoveryOk = consumeRecoveryIfMatch(user, code, { persist: true });
  if (!totpOk && !recoveryOk) {
    await registerFailedAttempt(user);
    throw httpError("El código es incorrecto o venció.", 401, "MFA_INVALID");
  }
  await resetFailedAttempts(user);
  if (recoveryOk) {
    await user.save();
    logger.info(`MFA login con código de recuperación · email=${user.email}`);
  }
}

/**
 * Completa el segundo paso del login (challenge MFA).
 * Si hay un enrolamiento pendiente, el código TOTP lo confirma.
 */
export async function verifyMfaChallenge(user, code) {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) {
    throw httpError("Ingresá el código de verificación.", 400);
  }
  assertMfaNotLocked(user);

  if (!userHasMfaEnabled(user)) {
    await confirmPendingEnrollment(user, trimmed);
  } else if (mfaState(user).pendingSecretEncrypted) {
    const pendingSecret = decryptUserSecret(user, "pendingSecretEncrypted");
    if (pendingSecret && verifyTotp(pendingSecret, trimmed)) {
      await confirmPendingEnrollment(user, trimmed);
    } else {
      await verifyEnabledMfa(user, trimmed);
    }
  } else {
    await verifyEnabledMfa(user, trimmed);
  }

  logger.info(
    `${user.rank} ${user.first_name} ${user.last_name} logged in as ${user.role} (MFA)`
  );
  return {
    ok: true,
    user: publicUserShape(user),
    token: issueAccessToken(user),
  };
}

/** Confirma el enrolamiento pendiente estando ya autenticado (JWT de acceso). */
export async function confirmEnrollment(user, code) {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) {
    throw httpError("Ingresá el código de verificación.", 400);
  }
  assertMfaNotLocked(user);
  await confirmPendingEnrollment(user, trimmed);
  return { ok: true, mfaEnabled: true };
}

export async function disableMfa(user, code) {
  if (!userHasMfaEnabled(user)) {
    throw httpError("La verificación en dos pasos no está activa.", 400);
  }
  const trimmed = String(code ?? "").trim();
  if (!trimmed) {
    throw httpError("Ingresá el código de verificación para desactivarla.", 400);
  }
  assertMfaNotLocked(user);
  await verifyEnabledMfa(user, trimmed);
  user.mfa = {
    enabled: false,
    secretEncrypted: "",
    pendingSecretEncrypted: "",
    recoveryCodeHashes: [],
    pendingRecoveryCodeHashes: [],
    failedAttempts: 0,
    lockUntil: null,
  };
  user.markModified?.("mfa");
  await user.save();
  logger.info(`MFA desactivado · email=${user.email}`);
  return { ok: true, mfaEnabled: false };
}

export async function findUserByIdForMfa(id) {
  const user = await UserMongoose.findById(id);
  if (!user) throw httpError("Usuario no encontrado.", 401);
  return user;
}
