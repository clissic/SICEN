---
name: admin-mfa-totp
description: >-
  MFA TOTP obligatorio para admin/superAdmin en SICEN (Google Authenticator).
  Usar al tocar login de administradores, enrolamiento QR otpauth, verificación
  del código, códigos de recuperación, desactivación, cifrado del secreto TOTP,
  rate limit de MFA, o las pantallas /login (paso intermedio) y /seguridad/mfa.
---

# MFA TOTP para administradores

Los roles `admin` y `superAdmin` **no reciben JWT de acceso** hasta completar
TOTP. El resto de roles sigue el login de un paso, salvo que tengan MFA activa.

## Fuente de verdad

| Capa | Path |
|---|---|
| Constantes | `SICEN-back/src/constants/mfa.js` |
| TOTP (RFC 6238, SHA1, 6 dígitos, 30 s) | `SICEN-back/src/utils/totp.util.js` |
| Cifrado AES-256-GCM | `SICEN-back/src/utils/mfaCrypto.util.js` |
| Códigos de recuperación (HMAC-SHA256) | `SICEN-back/src/utils/recoveryCodes.util.js` |
| Token de desafío (`purpose: "mfa"`) | `SICEN-back/src/utils/mfaJwt.util.js` |
| Servicio | `SICEN-back/src/services/mfa.service.js` |
| HTTP | `POST /api/sessions/login`, `/mfa/enroll`, `/mfa/verify`, `/mfa/disable` |
| Front helpers | `SICEN-front/src/utils/mfa.js` |
| UI login | `LoginPage` + `MfaEnrollPanel` + `MfaCodeForm` |
| UI gestión | `MfaSetupPage` (`/seguridad/mfa`) |

## Contrato HTTP

Login admin (password OK):

```json
{ "ok": true, "mfaRequired": true, "mfaEnrollmentRequired": true|false, "mfaToken": "..." }
```

Nunca incluye `token` de acceso. El `mfaToken` dura `MFA_CHALLENGE_EXPIRES_IN`
(default 5m) y los guards `checkLogin` / `optionalJwt` lo rechazan.

| Endpoint | Auth | Qué hace |
|---|---|---|
| `POST /api/sessions/mfa/enroll` | `mfaToken` o JWT de acceso | Genera secreto + QR otpauth + 10 códigos de un solo uso. Si MFA ya está activa, exige `currentCode`. |
| `POST /api/sessions/mfa/verify` | `mfaToken` o JWT | Con desafío: confirma enrolamiento pendiente (si hay) y emite JWT. Con JWT de acceso: solo confirma el pending. Rate limit 10/15 min por IP + lockout 5 fallos / 15 min por usuario (`mfa.failedAttempts`). |
| `POST /api/sessions/mfa/disable` | JWT (`loginOnly`) | Exige TOTP o código de recuperación. El admin la vuelve a configurar en el próximo ingreso. |

Respuestas siempre `{ ok, msg, ... }`. El secreto TOTP **nunca** viaja después
del enrolamiento; el subdoc `user.mfa` no se serializa (`toPublicUser` deja
solo `mfaEnabled`).

## Persistencia

Subdocumento `users.mfa` (no choca con `tokenVersion` del PR #12 ni con
`loginAttempts`/`lockUntil` del PR #10):

- `secretEncrypted` / `pendingSecretEncrypted`: AES-256-GCM (`iv.tag.ct` base64url)
- `recoveryCodeHashes` / `pendingRecoveryCodeHashes`: HMAC-SHA256
- Clave: `MFA_ENCRYPTION_KEY` (obligatoria en producción; no reciclar `JWT_SECRET`)

## Front

1. `login()` **no** llama `setAuthToken` si `mfaRequired`.
2. Enrolamiento: mostrar QR + clave manual + códigos, checkbox "Ya guardé los
   códigos", después TOTP → `verifyMfa({ mfaToken, code })` → `completeMfaLogin`.
3. Si ya está enrolado: solo `MfaCodeForm` (TOTP o recuperación).
4. Copys en español rioplatense, sin nombres de algoritmos ni rutas internas.

## Antipatrones

- ❌ Emitir JWT de acceso a un admin antes del TOTP.
- ❌ Guardar el secreto TOTP en claro o devolverlo en `/me`.
- ❌ Aceptar el `mfaToken` como Bearer en rutas `guarded`.
- ❌ Reusar `loginAttempts` del PR #10 para el lockout TOTP (usar `mfa.*`).
- ❌ Pedir MFA a skipper / user / seaman / agency.

## Ejemplos vivos

- `sessions.controller.js` (`login` + `mfaEnroll` / `mfaVerify` / `mfaDisable`)
- `LoginPage.jsx`, `MfaSetupPage.jsx`, `HomePage.jsx` (atajo para admin)
- Tests: `*.mfa.test.js`, `totp.util.test.js`, `mfa.service.test.js`,
  `MfaCodeForm.test.jsx`, `MfaEnrollPanel.test.jsx`
