# ServiCerca

Plataforma web que conecta a clientes que necesitan un oficio o servicio presencial con prestadores de su zona. Los clientes publican solicitudes de trabajo, los prestadores envían propuestas y el cliente acepta la que prefiera.

Proyecto Final de Diseño de Software, Equipo 06.

## Tecnologías

- Node.js 24 y Express 5
- SQLite con `better-sqlite3`
- Vistas con EJS (renderizadas en el servidor, en este mismo repositorio)
- Sesiones con `express-session`
- Contraseñas con `bcryptjs`
- Correos con `nodemailer` (cualquier servidor SMTP; en desarrollo, Ethereal)

## Requisitos

- Node 24 (con nvm: `nvm install 24` y `nvm use 24`)
- Git

No hace falta instalar ningún servidor de base de datos: SQLite guarda todo en un archivo local.

## Cómo arrancar el proyecto

1. `git clone https://github.com/danielonoide16/servicerca.git` y `cd servicerca`
2. `npm install`
3. Copiar `.env.example` como `.env` (Mac/Linux: `cp .env.example .env`, Windows: `Copy-Item .env.example .env`) y completar las variables (ver la tabla de abajo). Como mínimo, define un `SESSION_SECRET` propio.
4. `npm run migrate` para crear la base de datos (también se aplica sola al arrancar).
5. `npm run seed` para cargar datos de prueba.
6. `npm run dev` y abrir http://localhost:3000

Para correrlo sin recarga automática usar `npm start`.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor. Por defecto `3000`. |
| `NODE_ENV` | `development` (por defecto) o `production`. En producción las cookies son `secure`. |
| `SESSION_SECRET` | Texto largo y propio para firmar las sesiones. Obligatorio: si falta, el servidor no arranca. |
| `DATABASE_PATH` | Ruta del archivo SQLite, relativa a la raíz del proyecto o absoluta. Por defecto `db/servicerca.db`. |
| `APP_URL` | URL pública de la aplicación. Se usa para armar los enlaces de los correos. Por defecto `http://localhost:3000`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Servidor SMTP para enviar correos (`SMTP_SECURE=true` solo con el puerto 465). Ver [Correos](#correos). |
| `MAIL_FROM` | Remitente de los correos. |

Si el servidor SMTP no está configurado, el sistema funciona igual: los correos no salen, el aviso queda en la consola y las peticiones responden normalmente.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca el servidor con nodemon (se reinicia al guardar cambios). |
| `npm start` | Arranca el servidor con Node. |
| `npm run migrate` | Aplica las migraciones pendientes y muestra cuáles están aplicadas. |
| `npm run seed` | Limpia las tablas y carga los datos de prueba. |
| `npm run mail:ethereal` | Crea una cuenta de prueba en Ethereal e imprime las variables SMTP para el `.env`. |

## Base de datos

El motor es SQLite. El archivo (por defecto `db/servicerca.db`, configurable con `DATABASE_PATH`) se crea solo la primera vez que arranca el servidor, al correr `npm run migrate` o al correr el seed, y no se sube al repositorio. Si no se puede abrir la base de datos, el servidor muestra un mensaje en la consola y termina. En cada conexión se activan las llaves foráneas (`PRAGMA foreign_keys = ON`), por lo que es necesario abrir la base siempre mediante `db/db.js`.

### Migraciones

El modelo se versiona en archivos SQL numerados dentro de `db/migrations/` (por ejemplo, `001_inicial.sql`). Al abrir la base, `db/migrate.js` aplica en orden las que faltan y las registra en la tabla `schema_migrations`:

- Cada migración corre dentro de una transacción: si falla, no queda nada a medias.
- Se guarda el checksum de cada archivo. **Una migración ya aplicada no se edita**: los cambios nuevos van en un archivo nuevo (`002_...sql`). Si se edita una ya aplicada, el servidor avisa y no arranca.
- Si tu base viene de una versión anterior sin migraciones, borra el archivo `db/servicerca.db` y vuelve a iniciar.

### Tablas

| Tabla | Descripción |
|---|---|
| `oficios` | Catálogo de oficios: Plomería, Electricidad, Carpintería, Jardinería, Pintura y Albañilería. |
| `usuarios` | Cuentas de clientes y prestadores. Correo único (sin distinguir mayúsculas), contraseña con hash bcrypt y rol (`cliente` o `prestador`). |
| `perfiles_prestador` | Perfil de cada prestador: descripción y zona de servicio. Un usuario tiene como máximo un perfil. |
| `perfil_oficios` | Relación N:M entre perfiles y oficios (los oficios que ofrece cada prestador). |
| `solicitudes` | Trabajos publicados por un cliente: oficio, descripción, zona, fecha y estado (`Publicada`, `Asignada`, `Completada`, `Cancelada`). |
| `propuestas` | Ofertas de un prestador a una solicitud: precio, disponibilidad, mensaje y estado (`Enviada`, `Aceptada`, `Rechazada`). |
| `resenas` | Reseña del cliente sobre una solicitud completada: calificación de 1 a 5 y comentario. |
| `notificaciones` | Registro de los correos de aviso y si se enviaron (`Enviado`) o fallaron (`Fallido`). |

### Relaciones

- `usuarios` 1 : 0..1 `perfiles_prestador`
- `perfiles_prestador` N : M `oficios` (por `perfil_oficios`)
- `usuarios` (cliente) 1 : 0..* `solicitudes`
- `oficios` 1 : 0..* `solicitudes`
- `solicitudes` 1 : 0..* `propuestas`
- `usuarios` (prestador) 1 : 0..* `propuestas`
- `solicitudes` 1 : 0..1 `resenas`
- `propuestas` 1 : 0..* `notificaciones`

La asignación no es una tabla aparte: la propuesta asignada es la que tiene estado `Aceptada`.

### Reglas que la base de datos garantiza

| Regla | Cómo |
|---|---|
| RN-01: un correo, una cuenta | `UNIQUE` en `usuarios.correo`. |
| RN-03: una propuesta por prestador en cada solicitud | `UNIQUE (solicitud_id, prestador_id)`. |
| RN-04: una sola propuesta aceptada por solicitud | Índice único parcial `ux_propuesta_aceptada` (`WHERE estado = 'Aceptada'`). |
| RN-05: una reseña por solicitud | `solicitud_id` es llave primaria de `resenas`. |
| Calificación de 1 a 5, estados y roles válidos | `CHECK` en cada columna. |

Estas reglas **no** las puede comprobar la base de datos y las debe validar el código:

- Que `solicitudes.cliente_id` sea un usuario con rol `cliente` y `propuestas.prestador_id` uno con rol `prestador`.
- Que las transiciones de estado sean válidas (RN-06): `Publicada → Asignada → Completada`, y `Cancelada` desde `Publicada` o `Asignada`.
- Que solo el cliente dueño de una solicitud consulte sus propuestas, la acepte, la complete o la cancele (RN-02).
- Que la reseña solo se registre cuando la solicitud está `Completada` (RN-05).
- Que al aceptar una propuesta se actualicen en una sola transacción la propuesta elegida, las demás propuestas de la solicitud y el estado de la solicitud.

### Eliminación de registros

El borrado es **físico**. Las dependencias se eliminan en cascada (`ON DELETE CASCADE`):

- Al borrar un usuario se borran su perfil, sus oficios, sus solicitudes y sus propuestas.
- Al borrar una solicitud se borran sus propuestas y su reseña.
- Al borrar una propuesta se borran sus notificaciones.

Los oficios se protegen con `ON DELETE RESTRICT`: no se puede borrar un oficio que esté en uso.

## Datos de prueba (seed)

`npm run seed` borra el contenido de las tablas (excepto el catálogo de oficios) y lo vuelve a cargar, así que se puede correr varias veces sin errores ni duplicados. Los ids son siempre los mismos.

Carga 5 clientes, 5 prestadores con su perfil, 1 administrador, 2 usuarios sin verificar, 13 solicitudes (en todos los estados), 16 propuestas, 5 reseñas y 24 notificaciones, con relaciones coherentes. Una notificación queda como `Fallido` a propósito para probar ese caso.

Todos los usuarios de prueba tienen la contraseña `Password123`:

| Rol | Correo |
|---|---|
| Cliente | `laura.gomez@servicerca.test` |
| Cliente | `carlos.perez@servicerca.test` |
| Cliente | `sofia.ruiz@servicerca.test` |
| Cliente | `miguel.cruz@servicerca.test` |
| Cliente | `elena.vargas@servicerca.test` |
| Prestador | `roberto.mendoza@servicerca.test` |
| Prestador | `luis.hernandez@servicerca.test` |
| Prestador | `marta.salazar@servicerca.test` |
| Prestador | `jorge.ramirez@servicerca.test` |
| Prestador | `ana.torres@servicerca.test` |
| Admin | `admin@servicerca.test` |
| Cliente sin verificar | `valeria.nunez@servicerca.test` |
| Prestador sin verificar | `hector.lara@servicerca.test` |

## Estructura del proyecto

```
servicerca/
├── server.js            # Punto de entrada: configura Express, sesiones y rutas
├── db/                  # Todo lo de la base de datos
│   ├── db.js            # Conexión a SQLite
│   ├── migrate.js       # Ejecutor de migraciones
│   ├── migrations/      # Esquema versionado (001_inicial.sql, ...)
│   ├── seed.js          # Datos de prueba (npm run seed)
│   ├── tipos.js         # Constantes: roles, estados y propósitos de los tokens
│   └── tokenModel.js    # Consultas SQL de los tokens de un solo uso
├── clases/              # Clases del dominio (PerfilPrestador, SolicitudTrabajo, Resena)
├── routes/              # Rutas de las vistas (auth, cuenta, perfil, historial, solicitudes, propuestas, resenas)
├── controllers/         # Reciben la petición, validan los datos y renderizan la vista
├── middleware/          # cargarUsuario, requireAuth (requireRole, requireVerifiedEmail) y errorHandler
├── utils/               # correo.js (envío de correos con nodemailer) y log.js (mensajes de consola)
├── scripts/             # ethereal.js: crea una cuenta de prueba de correo
├── views/               # Plantillas EJS (auth, perfil, solicitudes, resenas, historial, partials)
└── public/css/          # Estilos
```

## Cuentas y sesiones

Todo se hace desde las vistas (formularios HTML): el proyecto no expone una API. Cada ruta responde con una página y, cuando hay errores en un formulario, vuelve a mostrarlo con los mensajes.

**Mecanismo de sesión:** `express-session` con una cookie `httpOnly` y `sameSite=lax` (`secure` en producción) que expira tras 30 minutos de inactividad. La sesión guarda solo el id del usuario: en cada petición el servidor carga la cuenta desde la base de datos (`req.user`). Por eso un cambio de rol se aplica de inmediato y, si la cuenta se elimina, la sesión deja de ser válida. Las contraseñas se guardan con bcrypt. Al registrarse hay que aceptar el aviso de privacidad (`/privacidad`).

| Método | Ruta | Descripción |
|---|---|---|
| GET / POST | `/registro` | Crear cuenta (`nombre`, `correo`, `contrasena`, `rol`, aceptar el aviso de privacidad). Responde 400 si hay datos inválidos y 409 si el correo ya existe |
| GET / POST | `/login` | Iniciar sesión (`correo`, `contrasena`). Responde 401 con el mismo mensaje si el correo no existe o la contraseña es incorrecta |
| POST | `/logout` | Cerrar sesión |
| GET / POST | `/verificar-correo` | Verifica el correo con el enlace recibido (`token`) |
| POST | `/reenviar-verificacion` | Envía un enlace nuevo (invalida el anterior). Si el correo ya está verificado no envía nada. Requiere sesión |
| GET / POST | `/olvide-contrasena` | Pide el enlace para restablecer la contraseña. Muestra siempre el mismo mensaje, exista o no la cuenta |
| GET / POST | `/restablecer-contrasena` | Cambia la contraseña con el enlace recibido (`token`, `contrasena`, `confirmacion`) |

Reglas de validación: el correo debe ser válido (se guarda en minúsculas), la contraseña debe tener de 8 a 72 caracteres con al menos una letra y un número, y el rol es `cliente` o `prestador`. El rol nunca se toma de otro lugar: cualquier otro valor, como `admin`, se rechaza, y el correo siempre empieza sin verificar. El primer administrador sale del seed.

### Middlewares de acceso

Están en `middleware/requireAuth.js` y se usan encadenados en las rutas:

| Middleware | Qué exige | Si falla |
|---|---|---|
| `requireAuth` | Sesión iniciada | Redirige a `/login` |
| `requireRole('admin')`, `requireRole('cliente', 'prestador')` | Que el rol del usuario esté en la lista | Redirige a `/login` si no hay sesión; página 403 si el rol no corresponde |
| `requireVerifiedEmail` | Correo verificado | Página 403 |

### Qué puede hacer un usuario sin verificar

Puede registrarse, iniciar sesión (no se le bloquea la entrada), ver las solicitudes y su cuenta. **No puede publicar solicitudes (cliente) ni enviar propuestas (prestador)**: esas dos acciones responden 403.

### Tokens de un solo uso

La verificación del correo y la recuperación de contraseña usan el mismo mecanismo: un token aleatorio de 32 bytes (`crypto.randomBytes`) que viaja solo en el enlace del correo. En la base de datos se guarda únicamente su hash sha256, junto con el propósito, el usuario y la fecha de expiración. Un token sirve una vez, expira (24 horas el de verificación y 1 hora el de restablecer contraseña) y pedir uno nuevo invalida el anterior del mismo propósito.

## Correos

El envío pasa por `utils/correo.js`, que arma el correo (HTML y texto) y lo manda con nodemailer. Si el correo falla, la petición no se rompe: el aviso queda en la consola y la respuesta es la misma (por ejemplo, el registro crea la cuenta aunque el correo no salga; el usuario puede pedir que se lo reenvíen). Los enlaces se arman con `APP_URL`.

### Cómo ver los correos en desarrollo (Ethereal)

[Ethereal](https://ethereal.email) es un buzón de prueba gratuito: no entrega correos reales, solo los guarda para que los veas en su página.

1. Corre `npm run mail:ethereal`. Crea una cuenta de prueba e imprime las variables `SMTP_*` y `MAIL_FROM`. (Si prefieres hacerlo a mano, usa el botón *Create Ethereal Account* en https://ethereal.email/create.)
2. Copia esas líneas en tu `.env` y reinicia el servidor.
3. Registra un usuario o usa "¿Olvidaste tu contraseña?".
4. Entra a https://ethereal.email/login con el usuario y la contraseña que imprimió el paso 1 y abre **Messages**: ahí aparecen los correos enviados, con su enlace.

Puedes usar cualquier otro servidor SMTP llenando las mismas variables.

### Correos que envía el sistema

| Correo | Qué lo dispara | A quién le llega |
|---|---|---|
| Verificación de correo | Registrarse, o pedir otro con "Reenviar enlace" | A la persona que se registró |
| Restablecer contraseña | "¿Olvidaste tu contraseña?" (solo si el correo tiene cuenta) | A la dueña de la cuenta |

### Verificación del correo y recuperación de contraseña

- Al registrarse se envía un enlace de verificación (vigencia de 24 horas). El enlace abre `/verificar-correo`, que muestra un botón de confirmación; el cambio se hace con un POST para que los antivirus o previsualizadores de enlaces no gasten el token sin querer.
- `/olvide-contrasena` muestra siempre el mismo mensaje y no espera al servidor de correo, para que nadie pueda averiguar qué correos tienen cuenta. El enlace (vigencia de 1 hora) abre `/restablecer-contrasena`.
- Pedir un enlace nuevo invalida los anteriores. Después de restablecer, la contraseña anterior deja de funcionar.
- Un token inválido, expirado o ya usado muestra el mismo mensaje en los tres casos.

## Mensajes en consola

El servidor escribe en la consola el arranque, los registros, los inicios de sesión y los errores. Nunca se escriben contraseñas, tokens ni enlaces. Los errores inesperados muestran al usuario una página con un mensaje genérico; el detalle técnico solo sale en la consola.

## Solicitudes y reseñas

La lógica vive en las clases `SolicitudTrabajo` y `Resena` (carpeta `clases/`); las rutas solo leen el formulario, llaman a la clase y muestran la vista.

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET / POST | `/solicitudes/nueva`, `/solicitudes` | Cliente con correo verificado | RF-04: publicar una solicitud (`oficio`, `descripcion` de 10 a 500 caracteres, `zona` de hasta 100). Responde 400 si hay datos inválidos |
| GET | `/solicitudes?oficio=&zona=` | Prestador | RF-05: buscar solicitudes publicadas. Los dos filtros son opcionales; la zona busca por coincidencia parcial sin distinguir mayúsculas. Máximo 50 resultados |
| GET | `/solicitudes/mias` | Cliente | Sus solicitudes con las acciones que permite cada estado |
| GET | `/solicitudes/:id` | Su cliente, o un prestador si está publicada | Detalle de la solicitud |
| POST | `/solicitudes/:id/completar` | Cliente dueño | RF-09: `Asignada → Completada`. 403 si no es suya, 409 si el estado no lo permite |
| POST | `/solicitudes/:id/cancelar` | Cliente dueño | RF-10: `Publicada` o `Asignada → Cancelada`. Las propuestas que seguían `Enviada` quedan `Rechazada` |
| GET / POST | `/resenas/nueva/:solicitudId` | Cliente dueño | RF-11: calificación de 1 a 5 y comentario opcional (hasta 500 caracteres). Solo con la solicitud `Completada` y una vez por solicitud |

## Estado actual

- Listo: modelo relacional, conexión a la base de datos, migraciones, seed, estructura base del servidor, manejo de errores, cuentas (registro, login, logout, roles), verificación de correo y recuperación de contraseña por correo, perfil del prestador, historial, publicar y buscar solicitudes, completarlas, cancelarlas y reseñarlas.
- Pendiente: propuestas (enviar, ver y aceptar) y el envío de correos de aviso.

## Flujo de trabajo

- Nunca hacer push directo a `main`; trabajar en ramas `feature/rf-XX-descripcion` y abrir Pull Request.
- Hacer `git pull` en `main` antes de crear una rama nueva.
- Si alguien agrega un paquete, los demás corren `npm install` después del pull.
- Los cambios al esquema van en una migración nueva en `db/migrations/`; nunca se edita una ya aplicada. Los demás corren `npm run migrate` después del pull.
