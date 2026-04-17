# Sistema Centinela

Aplicación web para la **Prefectura del Puerto de Montevideo**. Incluye **autenticación y perfiles de usuario**, **herramientas operativas de puerto** (clima, AIS, cámaras, llegadas, etc.), **administración de cuentas** y, como uno de sus módulos, **registro y consulta de infracciones vehiculares** u otras gestiones asociadas al ámbito prefectural.

El proyecto está construido como un **monolito Node.js**: backend con **Express** y render de vistas con **Handlebars** (más JS/CSS estático servido desde `public/`).

---

## Stack / Tecnologías

- **Runtime**: Node.js (ESM, `"type": "module"`).
- **Backend**: Express + middlewares (CORS, compression, body parsing).
- **Templates**: `express-handlebars` (vistas en `src/views/`).
- **Auth**: `passport` + `passport-local` (login/register) + `express-session`.
- **Persistencia**: MongoDB (Mongoose + `mongoose-paginate-v2`).
- **Sesiones**: almacenadas en MongoDB (`connect-mongo`).
- **Emails**: Nodemailer (Gmail).
- **Logs**: Winston (config por entorno).
- **UI**: **Bootstrap 5** (CSS + `bootstrap.bundle.js` por CDN), **Bootstrap Icons**, Handlebars, `styles.css` propio, **SweetAlert2**, JS en `public/assets/js/`.

---

## Estructura del proyecto

```text
public/
  assets/
    js/                 # JS del front (filtros, alerts, redirects, etc.)
    styles/             # CSS
  img/                  # Imágenes estáticas

src/
  app.js                # Entrypoint del servidor Express
  config.js             # __dirname para ESM
  config/
    env.config.js       # Carga .env según modo (DEVELOPMENT/PRODUCTION)
    passport.config.js  # Estrategias Passport (login/register)
  controllers/          # Controllers (API y renders)
  DAO/
    models/
      mongoose/         # Schemas Mongoose
      *.model.js        # Capa de acceso a datos (CRUD)
  middlewares/
    auth.js             # checkLogin / alreadyLogged / checkAdmin
  routes/               # Routers (API y HTML renders)
  services/             # Lógica de negocio + emails + tokens
  utils/                # logger, bcrypt, db connection, nodemailer, etc.
  views/                # Vistas Handlebars + layout
```

---

## Requisitos

- Node.js (recomendado **>= 18**).
- Acceso a una instancia MongoDB (en producción se usa Atlas).
- Credenciales de Gmail (si se usan las funciones de email).

---

## Configuración de entorno

La app carga variables de entorno desde:

- `./.env.development` cuando se ejecuta en modo `DEVELOPMENT`
- `./.env.production` cuando se ejecuta en modo `PRODUCTION`

Esto se define por CLI con `--mode` (ver scripts).

### Variables esperadas

Definidas en `src/config/env.config.js`:

```bash
# Server
PORT=3000
LOGGER_ENV=development   # development | production

# MongoDB (se inyecta en el connection string de Atlas)
MONGODB_PASSWORD=********

# App URL pública (se usa en emails, links de recuperación)
API_URL=http://localhost:3000

# Email (Nodemailer con Gmail)
GOOGLE_EMAIL=tu-cuenta@gmail.com
GOOGLE_PASS=tu-app-password-o-pass

# No se detectó uso activo en el código actual, pero están en env.config.js
GITHUB_LOGIN_SECRET=*****
PERSISTENCE=*****
TWILIO_ACCOUNT_SID=*****
TWILIO_AUTH_TOKEN=*****
TWILIO_PHONE_NUMBER=*****
```

> Nota: **no** se versionan los `.env*`. Crealos localmente según corresponda.

---

## Instalación

```bash
npm install
```

---

## Ejecución

### Desarrollo

```bash
npm run dev
```

Esto levanta `nodemon` ejecutando:

- `node ./src/app.js --mode DEVELOPMENT`

### Producción

```bash
npm start
```

Esto ejecuta:

- `node ./src/app.js --mode PRODUCTION`

---

## Backend (Express)

### Entrypoint

El servidor inicia en `src/app.js`:

- Conecta MongoDB (`connectMongo()`).
- Configura sesiones con `express-session` + `connect-mongo`.
- Inicializa Passport.
- Configura estáticos: `app.use(express.static("public"))`.
- Configura Handlebars:
  - `views`: `src/views`
  - `view engine`: `handlebars`
- Monta rutas:
  - **API** bajo `/api/*`
  - **renders HTML** bajo `/index/*` y `/`

### Conexión a base de datos

`src/utils/db-connection.js` conecta a MongoDB usando un connection string de Atlas que incluye:

- usuario fijo: `joaquinperezcoria`
- contraseña: `MONGODB_PASSWORD`
- nombre de la base de datos: definido en código (`src/utils/db-connection.js` y `src/app.js`)

### Sesión y autenticación

Hay dos niveles:

- **Passport Local** (`src/config/passport.config.js`)
  - Strategy `"login"` con `email` + `password`.
  - Strategy `"register"` para alta de usuario.
- **Session**: se guarda `req.session.user` al loguear (ver `src/controllers/sessions.controller.js`).

### Middlewares de autorización

En `src/middlewares/auth.js`:

- **`checkLogin`**: requiere `req.session.user`, si no existe redirige a `/`.
- **`alreadyLogged`**: si ya hay sesión, redirige a `/index/home`.
- **`checkAdmin`**: permite solo roles `admin` o `superAdmin` (si no, renderiza `errorPage`).

### Logging

`src/utils/logger.js` define un logger Winston según `LOGGER_ENV`:

- `development`: salida por consola con nivel `debug`.
- `production`: escribe en `./errors.log` con formato JSON + timestamp.

---

## Rutas

### Renders (Handlebars)

Se montan principalmente en `src/routes/index.html.router.js` (prefijo `/index`):

- **`GET /index/index`**: render `index`
- **`GET /index/home`**: render `home`
- **`GET /index/carFinesMenu`**: render `carFinesMenu`
- **`GET /index/carFineForm`**: render `carFineForm`
- **`GET /index/allCarFines`**: render `allCarFinesPaginated` (paginación + filtros por querystring)
- **`GET /index/updateCarFine`**: render `updateCarFine`
- **`GET /index/deleteCarFine`**: render `deleteCarFine`
- **`GET /index/userFines`**: render `userFines`
- **`GET /index/usersMenu`**: render `usersMenu` (requiere admin)
- **`GET /index/toolsMenu`**: render `toolsMenu`
- **`GET /index/ais`**, **`/index/weather`**, **`/index/cameras`**, **`/index/arrives`**: tools

Login y pantallas públicas están en `src/routes/login.html.router.js`:

- **`GET /`**: render `login` (si ya hay sesión, redirige a `/index/home`)
- **`GET /newAccount`**: render `newAccountForm`
- **`GET /forgotPassword`**: render `forgotPasswordForm`
- **`GET /passportFailure`**: render `passportFailure`

### API (JSON y acciones con render)

#### Sesiones

`src/routes/sessions.router.js` (prefijo `/api/sessions`):

- **`POST /api/sessions/signup`**: register (Passport `"register"`)
- **`POST /api/sessions/login`**: login (Passport `"login"`)
- **`GET /api/sessions/logout`**: logout (destruye sesión)

#### Usuarios

`src/routes/users.router.js` (prefijo `/api/users`):

- **`POST /api/users/newAccount`**: envía solicitud de creación de cuenta por email (renderiza `success/errorPage`)
- **`POST /api/users/create`**: crea usuario (JSON)
- **`POST /api/users/createAndSendEmail`**: crea usuario + email de bienvenida (renderiza `success/errorPage`)
- **`GET /api/users/`**: lista usuarios (JSON)
- **`GET /api/users/:id`**: usuario por ID (JSON)
- **`POST /api/users/updatePasswordForm`**: cambia contraseña del usuario logueado (render)
- **`POST /api/users/updateDataForm`**: solicita actualización de datos por email (render)
- **`GET /api/users/update/userUpdate?id=...`**: busca usuario y renderiza formulario de update (admin/contable)
- **`GET /api/users/updateUser/:id?...query`**: actualiza usuario vía querystring (admin)
- **`GET /api/users/findBy/id/delete?id=...`**: busca usuario y renderiza confirmación de delete (admin)
- **`GET /api/users/delete/:id`**: elimina usuario (admin)

#### API infracciones vehiculares (`carFines`)

`src/routes/carFines.router.js` (prefijo `/api/carFines`):

- **`GET /api/carFines/getAll`**: lista registros (JSON)
- **`GET /api/carFines/:id`**: registro por ID (JSON)
- **`POST /api/carFines/create`**: crea registro (JSON)
- **`DELETE /api/carFines/:id`**: elimina por ID (JSON)
- **`POST /api/carFines/createAndRender`**: crea y renderiza `success` (requiere login)
- **`GET /api/carFines/findBy/number/update?fine_number=...`**: render update por número (login + rol)
- **`GET /api/carFines/update/:fine_number?...query`**: actualiza por número (login + rol)
- **`GET /api/carFines/findBy/number/delete?fine_number=...`**: render delete por número (login + rol)
- **`GET /api/carFines/delete/:fine_number`**: borra por número (login + rol)

#### Recuperación de contraseña (tokens)

`src/routes/tokens.router.js` (prefijo `/api/tokens`):

- **`POST /api/tokens/recoverPassword`**: envía email con token y link de recuperación
- **`GET /api/tokens/recoverPassword?token=...&email=...`**: valida token y renderiza `newPasswordForm`
- **`POST /api/tokens/recoverForm`**: setea nueva contraseña (renderiza `login` o `newPasswordForm`)

---

## Frontend (Handlebars)

### Layout

`src/views/layouts/main.handlebars` define:

- Atributo **`data-bs-theme="light"`** en `<html>` (modo claro por defecto; el JS lo sincroniza con la preferencia guardada).
- **Bootstrap 5.3** (CSS + JS bundle por CDN, con Popper incluido).
- **Bootstrap Icons** (CDN).
- **SweetAlert2** (CSS).
- CSS global del proyecto: **`/assets/styles/styles.css`** (carga después de Bootstrap para poder sobrescribir).
- **Toggle de tema** fijo (claro/oscuro + íconos sol/luna), con preferencia en **`localStorage`** (`sistemaCentinela.theme`).
- **Script global** `/assets/js/index.js`: aplica `data-bs-theme` (`light` | `dark`), actualiza el ícono de cabecera **`#cornerLogo`** (`/img/cintaPNN.png` en claro, `/img/cintaPNN-dark.png` en oscuro) y el estado del switch.
- Footer y cierre de scripts.
- Render del cuerpo con `{{{body}}}`

### Modo claro / oscuro (Bootstrap 5)

El tema **no** usa `data-theme` personalizado: se usa el **color mode de Bootstrap** en el elemento raíz:

- `document.documentElement.setAttribute("data-bs-theme", "dark" | "light")`

Las variables CSS propias del proyecto (`--text`, `--surface-card`, etc.) y las de Bootstrap (`--bs-body-bg`, `--bs-body-color`, …) se definen en `public/assets/styles/styles.css` bajo `html[data-bs-theme="dark"]` y `html[data-bs-theme="light"]`. Detalle de colores: ver **`PALETA_COLORES.md`**.

### Vistas

Las vistas principales están en `src/views/*.handlebars`, por ejemplo:

- **Auth**: `login`, `newAccountForm`, `forgotPasswordForm`, `passportFailure`, `newPasswordForm`, `updatePasswordForm`
- **Home / menús**: `home`, `index`, `carFinesMenu`, `usersMenu`, `toolsMenu`, `shipFinesMenu`
- **Infracciones vehiculares (módulo)**: `carFineForm`, `allCarFinesPaginated`, `updateCarFine`, `deleteCarFine`, `userFines`
- **Usuarios**: `allUsersPaginated`, `newUser`, `updateUser`, `deleteUser`
- **Comunes**: `success`, `errorPage`

### Assets estáticos

Se sirven desde `public/`:

- JS: `public/assets/js/*.js`
  - `index.js`: tema Bootstrap (`data-bs-theme`), logo de cabecera según modo, switch global.
  - `allCarFines.js`: filtros por querystring + alert de estado (`due/paid/dismissed`)
  - `allUsers.js`, `updateCarFine.js`, `userFines.js`, etc.
- CSS: `public/assets/styles/styles.css` (tokens de tema + estilos de la app; compatible con clases Bootstrap).
- Imágenes: `public/img/*` (incluye `cintaPNN.png` / `cintaPNN-dark.png` para la cabecera según el tema).

---

## Notas operativas / producción

### Sesión: secreto hardcodeado

En `src/app.js` el `secret` de sesión está hardcodeado. Para producción se recomienda moverlo a una variable de entorno (por ejemplo `SESSION_SECRET`) y rotarlo según política.

### Base de datos

El connection string se arma en código e incluye un usuario fijo. Para operación más segura, conviene parametrizar usuario/host/db en env en lugar de “quemarlos” en el repo.

### Dependencias declaradas sin uso visible

En el código actual no se detectó uso de:

- `socket.io` / `socket.io-session`
- variables Twilio/GitHub/Persistence (solo aparecen en `env.config.js`)

Si son features futuros o legacy, documentarlas/limpiarlas puede ayudar a mantenimiento.

---

## Troubleshooting

- **Redirección constante a `/`**: no hay sesión (`req.session.user`). Verificá login y store de sesión (Mongo).
- **No conecta a MongoDB**: `MONGODB_PASSWORD` incorrecta o problemas de red/Atlas IP whitelist.
- **No salen emails**: credenciales Gmail (`GOOGLE_EMAIL/GOOGLE_PASS`) inválidas. Para Gmail suele requerir “App Password”.
- **Links de recuperación rotos**: `API_URL` mal configurada (se usa en el HTML del email).

---

## Scripts (npm)

- **`npm run dev`**: `nodemon -e yaml,js ./src/app.js --mode DEVELOPMENT`
- **`npm start`**: `node ./src/app.js --mode PRODUCTION`

