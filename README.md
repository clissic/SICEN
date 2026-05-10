# Sistema Centinela (SICEN)

Aplicación para la **Prefectura del Puerto de Montevideo**: API **Node.js (Express, ESM)** con **MongoDB (Mongoose)** y autenticación **JWT**, más SPA **React 18 + Vite 5** y **React Router 6**. Estilos: **Bootstrap 5.3** (CDN) e iconos Bootstrap Icons; tema claro/oscuro con `data-bs-theme` y estilos en `SICEN-front/src/styles/sistema.css`.

## Estructura del monorepo

| Ruta | Rol |
|------|-----|
| **`SICEN-back/`** | Servidor Express. Sirve la API bajo **`/api/*`** y, si existe el build, la SPA desde **`SICEN-back/public/`**. |
| **`SICEN-front/`** | Código fuente React. **`npm run build`** genera estáticos en **`../SICEN-back/public`**. |
| **Raíz** | `package.json` con **Prettier** para formatear todo el repo (`npm run format`). Aquí se instala solo Prettier; no sustituye los `node_modules` de front ni back. |

Documentación de paleta y tokens CSS: **`SICEN-front/PALETA_COLORES.md`**.

### Alcance del producto

SICEN es una **plataforma operativa amplia** para la Prefectura: bases de datos (buques, gente de mar), gestión de unidades, usuarios, herramientas externas y, de forma **no central** en la experiencia diaria del usuario, **multas** (vehículos y buques). El menú principal y la tarjeta de datos personales **no priorizan** el módulo de multas; las pantallas y API relacionadas con multas **siguen disponibles** y se irán **reforzando y alineando** en próximas entregas.

### Cambios recientes documentados en código

| Área | Detalle |
|------|---------|
| **Inicio (`/home`)** | En la tarjeta de perfil se quitó el indicador «Multas realizadas» y el botón «MIS MULTAS». Siguen «Cambiar contraseña» y «Actualizar datos». La ruta `/mis-multas` puede seguir existiendo para uso directo o futuras mejoras. |
| **Gestión de usuarios (`/usuarios`)** | Panel para administradores con estadísticas agregadas (totales, oficiales/subalternos/civiles), tabla «Usuarios por rol» (cantidades destacadas), gráficos de barras por **unidad** y por **jerarquía** (Chart.js, tema en `constants/usersChartTheme.js`). |
| **Nuevo usuario (`/usuarios/nuevo`)** | Formulario con **selector de rol**: Usuario, Administrador y (solo si quien crea la cuenta es **super administrador**) Super administrador. La API `POST /api/users/createAndSendEmail` valida el rol; solo **superAdmin** puede asignar el rol `superAdmin` al crear. |

## Requisitos

- **Node.js** (recomendado: LTS actual) y **npm**.
- **MongoDB** accesible (p. ej. Atlas). La base usada por el código se llama **`SIGMU_DB`** (nombre histórico en `app.js` / conexión).

## Instalación

```bash
# Raíz (Prettier)
npm install

# Backend
cd SICEN-back && npm install

# Frontend
cd ../SICEN-front && npm install
```

## Variables de entorno

Solo hace falta configurar archivos en **`SICEN-back/`** (no en la raíz ni en `SICEN-front` para el flujo actual). El servidor carga:

- **`SICEN-back/.env.development`** cuando corrés en modo desarrollo (`npm run dev` → `--mode DEVELOPMENT`).
- **`SICEN-back/.env.production`** cuando corrés **`npm start`** (`--mode PRODUCTION`).

Los archivos `.env*` están en **`.gitignore`**. Para crearlos rápido:

```bash
cd SICEN-back
copy .env.example .env.development
copy .env.example .env.production
```

Luego completá los valores según tu entorno (y recordá que **`JWT_SECRET` es obligatorio en producción**).

| Variable | Uso |
|----------|-----|
| `PORT` | Puerto HTTP del servidor (por defecto `3000`). |
| `JWT_SECRET` | Firma de tokens. **Obligatoria en producción**; si falta, el proceso termina. En desarrollo puede omitirse (se usa un valor por defecto inseguro solo para local). |
| `JWT_EXPIRES_IN` | Caducidad del access token (p. ej. `24h`). |
| `MONGODB_PASSWORD` | Contraseña inyectada en el string de conexión a MongoDB. |
| `LOGGER_ENV` | `development` \| `production` (comportamiento de logs). |
| `API_URL` | URL base pública (emails, enlaces). |
| `PUBLIC_APP_URL` | Opcional; si existe, tiene prioridad sobre `API_URL` para la URL pública de la app (sin barra final). |
| `GOOGLE_EMAIL` / `GOOGLE_PASS` | Credenciales Nodemailer (p. ej. Gmail con app password). |
| `CORS_ORIGIN` | Opcional. Orígenes permitidos separados por **coma**. Si no se define, se usan por defecto el propio servidor (`localhost`/`127.0.0.1` al `PORT`) y `http://localhost:5173` (Vite). |
| `GITHUB_LOGIN_SECRET`, `PERSISTENCE`, variables Twilio | Declaradas en `env.config.js`; reservadas u opcionales según evolución del proyecto. |

## Desarrollo

### Una sola URL (API + SPA compilada)

1. Completá **`SICEN-back/.env.development`** (al menos MongoDB y, en serio, un `JWT_SECRET` propio aun en local).
2. Desde **`SICEN-back`**:

   ```bash
   npm run dev
   ```

   El script **`predev`** ejecuta el **build del cliente** y luego **nodemon** sobre `src/app.js`. Abrí **`http://localhost:<PORT>`** (p. ej. 3000): mismo origen para la SPA y **`/api/*`**.

### Front con recarga rápida (Vite)

En otra terminal, desde **`SICEN-front`**:

```bash
npm run dev
```

Abrí **`http://localhost:5173`**. El proxy de Vite reenvía **`/api`** a **`http://localhost:3000`**; el backend debe estar corriendo por separado (p. ej. `cd SICEN-back && npm run dev` **sin** depender del build previo del front, o con un build ya hecho según cómo prefieras trabajar).

### Cliente y JWT

El front guarda el access token en **`localStorage`** bajo la clave **`sicen_auth_token`** y envía **`Authorization: Bearer <token>`** en las peticiones a la API (`SICEN-front/src/api/client.js`). Login y signup guardan el token; logout y errores de sesión lo limpian cuando corresponde.

## Producción / despliegue

Necesitás el repo con **`SICEN-front`** y **`SICEN-back`**, **`SICEN-back/.env.production`** con **`JWT_SECRET`** y el resto de secretos, y la carpeta **`SICEN-back/public/`** generada antes del arranque.

```bash
cd SICEN-back
npm install
cd ../SICEN-front && npm install && npm run build
cd ../SICEN-back
npm start
```

Equivalente: desde **`SICEN-back`**, `npm run build` (compila el cliente) y luego **`npm start`**.

El hosting debe servir el proceso Node que ya expone estáticos y la API, o adaptar proxy estático según tu plataforma.

## API (prefijo `/api`)

| Montaje | Contenido típico |
|---------|-------------------|
| **`/api/sessions`** | `GET /me` (JWT opcional), `POST /login`, `POST /signup`, `POST /logout`. |
| **`/api/users`** | Usuarios, paginación, alta (incluye **`role`** en `createAndSendEmail` con reglas por rol), actualización, borrado, formularios (según rol y middleware). |
| **`/api/carFines`** | Multas vehiculares: creación, listados, paginación, operaciones por número, etc. |
| **`/api/tokens`** | Recuperación de contraseña y flujos de token por email. |

Todas las rutas JSON; no hay vistas Handlebars montadas en `app.js` (código legacy puede existir en el árbol sin usarse).

## Emails (recuperación y cuentas)

Los enlaces de correo usan la URL pública derivada de **`PUBLIC_APP_URL`** o **`API_URL`**. La recuperación apunta a la ruta React de restablecimiento (p. ej. **`/restablecer?token=...&email=...`**). La API valida tokens según los endpoints documentados en el código de **`tokens`**.

## Seguridad (resumen)

| Área | Política |
|------|----------|
| **Auth (JWT)** | `GET /api/sessions/me`: sin `Authorization` → usuario nulo; token inválido → `401`. Rutas protegidas: **`Authorization: Bearer`**. `POST /logout` es informativo (JWT stateless; el cliente borra el token). |
| **Tokens de recuperación** | Endpoints públicos; conviene **rate limiting** en producción. |
| **Usuarios** | Operaciones sensibles requieren roles (**admin** / **superAdmin** / reglas por ruta). Datos de contraseña no se exponen en respuestas de perfil. |
| **Multas** | API y pantallas de multas disponibles; permisos según rol (**admin**, **contable**, etc.). La **home** ya no muestra contador ni acceso rápido personales a «mis multas» (el foco de producto es más amplio). |

Pendientes habituales en producción: **rate limiting** (login, recuperación, altas de cuenta), endurecer CORS, y desactivar **`POST /signup`** si no querés registro público.

## Código y formato

- **Prettier** (raíz): `npm run format` / `npm run format:check`. Config: **`.prettierrc.cjs`**. Ignorados: **`.prettierignore`** (incluye `node_modules`, `SICEN-back/public`, locks, etc.).
- **`.gitignore`** en la raíz aplica al monorepo (entornos, logs, `dist`, etc.). **`SICEN-back/.gitignore`** incluye además **`public/`** (artefacto de build del front).

---

Desarrollado por JPC® — Prefectura Nacional Naval.
