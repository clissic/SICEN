# Sistema Centinela (SICEN)

Aplicación para la **Prefectura del Puerto de Montevideo**: API **Node.js (Express, ESM)** con **MongoDB (Mongoose)** y autenticación **JWT**, más SPA **React 18 + Vite 5** y **React Router 6**. Estilos: **Bootstrap 5.3** (CDN) e iconos Bootstrap Icons; tema claro/oscuro con `data-bs-theme` y estilos en `SICEN-front/src/styles/sistema.css` y `SICEN-front/src/styles/menu-tiles.css` (tarjetas de menú e inicio).

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
| **Inicio (`/home`) — menú principal** | La columna derecha agrupa las opciones en **subsecciones** (mismo criterio visual que Sistemas externos: título en mayúsculas y borde inferior). **Menú principal:** *El Centinela* (`centinelaMenu.jpg`, sin enlace; overlay al hover con texto «EN DESARROLLO» y estilos en `SICEN-front/src/styles/menu-tiles.css`); *Estado Rector de Puertos* → `/estado-rector-puertos` (`erpMenu.jpg`, ícono `bi-globe`); *Mi Unidad* → `/mi-unidad` (cabecera `/img/<unit>.jpg` según `user.unit`, codificado en URL, con imagen de respaldo si falta el archivo; en el recuadro del tile se mantiene el **escudo** de la unidad como antes). **Áreas de Gestión:** gestión de buques, gente de mar, multas, unidades y usuarios (la última solo enlaza para **admin** / **superAdmin**). **Ayudas al navegante:** *Sistemas externos* → `/herramientas` (hub de mapas, meteorología y otras herramientas). Las rejillas de tarjetas usan `row-cols-1 row-cols-md-2 row-cols-lg-1 row-cols-xl-3`: entre **992px y 1199px** las fichas se muestran **una debajo de la otra**; desde **1200px**, tres columnas. |
| **Inicio (`/home`) — tarjeta de perfil** | Se quitó el bloque lateral «Mi Unidad» (pasó al menú principal). En la tarjeta de perfil siguen datos de usuario y unidad; se mantienen **sin** indicador «Multas realizadas» ni botón «MIS MULTAS» (la ruta `/mis-multas` puede seguir existiendo). Los botones **Cambiar contraseña**, **Actualizar datos** y **Manual del usuario** (este último **deshabilitado**): disposición en **fila de tres** con ícono arriba, texto centrado y línea inferior; en viewport **992px–1199px** la misma fila pasa a **una columna** (`row-cols-3 row-cols-lg-1 row-cols-xl-3`). Estilo del botón según tema: **`btn-light`** en modo claro y **`btn-dark`** en modo oscuro (`useBootstrapTheme()` en `HomePage.jsx`). |
| **Estado Rector de Puertos** | Ruta protegida **`/estado-rector-puertos`** (`SICEN-front/src/pages/EstadoRectorPuertosPage.jsx`): pantalla placeholder con enlace al menú principal. Registrada en `SICEN-front/src/App.jsx`. |
| **Gestión de usuarios (`/usuarios`)** | Panel para administradores con estadísticas agregadas (totales, oficiales/subalternos/civiles), tabla «Usuarios por rol» (cantidades destacadas), gráficos de barras por **unidad** y por **jerarquía** (Chart.js; paleta y ejes en `constants/usersChartTheme.js`, **adaptados al tema claro/oscuro**). Tarjeta **Borrar** alineada visualmente con el patrón de borrado de otras secciones. Las tarjetas del menú de acciones (crear / consultar / modificar / borrar) comparten el patrón visual de Gestión de buques: ícono Bootstrap en chip y títulos en mayúsculas. |
| **Nuevo usuario (`/usuarios/nuevo`)** | Formulario con **selector de rol**: Usuario, Administrador y (solo si quien crea la cuenta es **super administrador**) Super administrador. La API `POST /api/users/createAndSendEmail` valida el rol; solo **superAdmin** puede asignar el rol `superAdmin` al crear. |
| **Gestión de unidades (`/gestion-unidades`)** | Tarjetas admin (sumar / modificar / borrar) con **imagen** e **icono**; borrado con borde de advertencia. Al **modificar** una unidad sin PNG de escudo en disco, la API guarda la URL de escudo genérico (**PRENA**) y el front evita usar el avatar de usuario como placeholder. |
| **Gestión de buques (`/base-buques`)** | Hub con tarjetas **CREAR** → `/base-buques/nuevo`, **CONSULTAR** → `/base-buques/todos` (listado paginado; desde cada fila se abre **Certificados** → `/base-buques/certificados/:vesselId`), **MODIFICAR** → `/base-buques/editar` (misma lista que consultar) y formulario `/base-buques/editar/:vesselId`, **BORRAR BUQUE** → `/base-buques/eliminar` (solo **admin** / **superAdmin**: tarjeta con borde de advertencia y ruta protegida). El alta y la edición comparten **`ShipRegistrationForm.jsx`** (mercante ultramar o cabotaje, y deportivo; listas y valores por defecto en `SICEN-front/src/constants/`). Tras enviar el formulario o ante errores de validación, la vista hace **scroll al inicio** (`SICEN-front/src/utils/scrollPageToTop.js`). **Certificados:** fechas en `input type="date"` (ISO); utilidades en `SICEN-front/src/utils/dateDdMmYyyy.js` para mostrar en tabla y aceptar registros antiguos en `dd/mm/aaaa`; presets definidos en código más **otros certificados** agregables por el usuario, persistidos en Mongo (`extraCertificatePresetKeys`) vía API `POST /api/vessels/by-business-id/:id/extra-certificate-presets`. En la **tabla de vencimientos** de esa pantalla, las celdas con fecha **anterior al día actual** se muestran en **rojo** (texto destacado y fondo suave) y las que vencen **hoy o en los próximos 30 días** en **amarillo/naranja**; a continuación de la fecha hay un ícono de alerta (`bi-exclamation-triangle-fill`) que al **hover** (o foco) abre un **popover** de Bootstrap 5 con el texto «Certificado vencido» o «Certificado próximo a vencer». El criterio de días se calcula en calendario local con **`certificateExpiryUrgency`** en el mismo util de fechas; los popovers se inicializan en `ShipCertificatesPage.jsx` sobre el contenedor de la tabla y se destruyen al actualizar filas. El módulo reemplaza la pantalla única previa `BaseBuquesPage.jsx`. |
| **Gente de mar (`/base-gente-mar`)** | Hub con tarjetas: **INGRESAR PERSONA** → `/base-gente-mar/nuevo` (`SeafarerCreateForm.jsx`): identificación con **DNI** y **credencial cívica** obligatorios (serie + número); **pasaporte** y **datos morfológicos** (cabello, ojos, cutis, altura en cm) opcionales, **género** (masculino/femenino), **tipo de sangre** (grupo A/B/AB/O y factor Rh +/−), carnés de salud/vacunación y contacto; **sin libreta de embarque** en el alta (se registrará como licencia). **CONSULTAR Y MODIFICAR** → `/base-gente-mar/todos`: búsqueda por DNI, pasaporte o CC (`GET /api/seafarers/by-document`; query `ccSeries`/`ccNumber` si tipo CC); ficha con títulos, licencias (`heldLicenses` + histórico), cursos, sanciones y observaciones; columnas **Renovaciones** y checkbox **Renovación** al editar (`renewalsCount` / `isRenewal`). Scroll a sección tras guardar título o licencia. **METADATOS** → catálogos y listados de cursos/sanciones. Esquema Mongoose en `seafarers.mongoose.js` (`identificationDocuments`, `morphologicalData`, `personalData.bloodType`; `maritimeFitness` sin `seamanBook`). Registros antiguos con `document.type`/`number` siguen siendo buscables y visibles en consulta. |
| **Multas vehículos (`/multas/vehiculos`)** | Menú con tarjeta **Borrar** con imagen e iconografía coherente con el resto de acciones destructivas. En formularios de **multas vehiculares** (alta, modificación y búsqueda por número) los campos numéricos relevantes usan `min` y bloqueo de teclas negativas (`SICEN-front/src/utils/nonNegativeNumberInput.js`; mismo patrón en algunos campos del **registro de buques**). |
| **Sistemas externos (`/herramientas`)** | Una sola pantalla con tres bloques: **Aplicaciones de mapas** (AIS y Windy embebidos, catastro en iframe, **Carta náutica** OpenSeaMap en iframe vía `/herramientas/opensea`), **Información meteorológica** (enlaces a SOHMA, TCP y meteograma Montevideo, con imágenes en tarjetas) y **Otras herramientas** (cámaras Antel TV, consulta arribos ANP). Iconos en tarjetas; imágenes de apoyo en mapas y cámaras/arribos. El acceso desde el inicio está bajo **Ayudas al navegante**. |
| **Mi Unidad (`/mi-unidad`)** | En el resumen de la unidad, junto al teléfono se muestra el **email de sala de radio** (`emailRadio`) con enlace `mailto:` cuando existe. |
| **Procedimientos (Mi unidad → divisiones I/II, Capital humano)** | Listado de PDF/Word con **fecha** (mtime en disco) y **tamaño** bajo el nombre del archivo. **Subir** y **eliminar** archivos: solo en UI para **admin** y **superAdmin**; la API (`POST`/`DELETE` bajo `/api/unit-files/...`) exige el mismo rol. |
| **Rutas no definidas** | Cualquier path que no coincida con las rutas de la SPA muestra la página **404** (`NotFoundPage`) con imagen `public/img/404.png` y enlace al inicio o al login según sesión. |
| **Servidor (`SICEN-back/src/app.js`)** | Si falta el build del front y el navegador pide un `.js`/`.css` bajo `/assets/`, la respuesta ya **no** devuelve `index.html` (evita el error de MIME «expected JavaScript»); conviene siempre generar `SICEN-front` → `SICEN-back/public` antes de servir en producción. |

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
| **`/api/units`** | Unidades registradas: listado, alta/baja/modificación (roles admin), `GET` por sigla para datos de escudo y contacto. |
| **`/api/vessels`** | Buques: `POST /` alta inicial (JWT); `GET /paginated` listado paginado; `GET /by-business-id/:vesselId` detalle; `GET /by-business-id/:vesselId/for-edit` payload alineado al formulario de edición; `PUT /by-business-id/:vesselId` actualización; `DELETE /by-business-id/:vesselId` baja (**admin** / **superAdmin**, middleware `checkAdmin`); `POST /by-business-id/:vesselId/certificates` guardar certificado; `POST /by-business-id/:vesselId/extra-certificate-presets` agregar clave de preset «otro certificado» persistida en el documento del buque. |
| **`/api/seafarers`** | Gente de mar (JWT): `GET /by-document` búsqueda por tipo y número de documento; `POST /` alta de persona; títulos poseídos `POST /:id/titles`, `PATCH /:id/titles/:entryId`, `DELETE /:id/titles/:entryId`; licencias poseídas (catálogo `licences`) `POST /:id/held-licenses`, `PATCH /:id/held-licenses/:entryId`, `DELETE /:id/held-licenses/:entryId`; `POST /:id/licenses` ítem en bucket histórico (`recreational` / `comercial` / `special`); `POST /:id/courses`, `POST /:id/sanctions`, `POST /:id/observations`; `GET /metadata/courses` y `GET /metadata/sanctions` (listados paginados para la pantalla de metadatos). En `PATCH` de título o licencia poseídos, el flag opcional **`isRenewal`** (boolean) incrementa **`renewalsCount`** del subdocumento en el servidor. |
| **`/api/titles`** | Catálogo de títulos STCW (JWT): `GET /` listado, `POST /` alta, `PATCH /:id`, `DELETE /:id`. |
| **`/api/licences`** | Catálogo unificado de metadatos con campo **`kind`**: `title` \| `license` (JWT): `GET /` (filtros/listado según controlador), `POST /`, `PATCH /:id`, `DELETE /:id`. Las licencias en `heldLicenses` deben apuntar a entradas con `kind: license`. |
| **`/api/unit-files`** | Archivos bajo `files/units/<sigla>/…`: listados de **procedimientos** por división (DIV-I / DIV-II). **Subida y borrado** de procedimientos requieren **admin** o **superAdmin**; el listado y la descarga por URL siguen disponibles al usuario con unidad registrada. |
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
| **Procedimientos en disco** | Solo **admin** / **superAdmin** pueden subir o eliminar archivos en las carpetas de procedimientos por división; el resto de roles solo consulta y descarga. |
| **Buques (baja)** | El `DELETE` en `/api/vessels/by-business-id/:vesselId` exige **admin** o **superAdmin**. En la SPA, `/base-buques/eliminar` usa `ProtectedRoute admin` y el menú de buques solo muestra la tarjeta **BORRAR BUQUE** a esos roles. |

Pendientes habituales en producción: **rate limiting** (login, recuperación, altas de cuenta), endurecer CORS, y desactivar **`POST /signup`** si no querés registro público.

## Código y formato

- **Prettier** (raíz): `npm run format` / `npm run format:check`. Config: **`.prettierrc.cjs`**. Ignorados: **`.prettierignore`** (incluye `node_modules`, `SICEN-back/public`, locks, etc.).
- **`.gitignore`** en la raíz aplica al monorepo (entornos, logs, `dist`, etc.). **`SICEN-back/.gitignore`** incluye además **`public/`** (artefacto de build del front).

---

Desarrollado por JPC® — Prefectura Nacional Naval.
