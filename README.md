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

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca el servidor con nodemon (se reinicia al guardar cambios). |
| `npm start` | Arranca el servidor con Node. |
| `npm run migrate` | Aplica las migraciones pendientes y muestra cuáles están aplicadas. |
| `npm run seed` | Limpia las tablas y carga los datos de prueba. |

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
│   └── tipos.js         # Constantes: roles, estados y propósitos de los tokens
├── routes/              # Rutas de las vistas (por ahora vacías)
├── middleware/          # errorHandler (404 y errores)
├── utils/               # log.js: mensajes de consola
├── views/               # Plantillas EJS (error y partials)
└── public/css/          # Estilos
```

## Mensajes en consola

El servidor escribe en la consola el arranque, los registros, los inicios de sesión y los errores. Nunca se escriben contraseñas, tokens ni enlaces. Los errores inesperados muestran al usuario una página con un mensaje genérico; el detalle técnico solo sale en la consola.

## Estado actual

- Listo: modelo relacional con migraciones y seed, configuración del servidor (sesiones, manejo de errores, consola) y layout de las vistas.
- Pendiente: cuentas, verificación de correo, perfil, solicitudes, propuestas y reseñas.
├── middleware/          # Middlewares (se irán agregando)
├── utils/               # Utilidades
├── views/               # Plantillas EJS
└── public/css/          # Estilos
```

## Estado actual

- Listo: modelo relacional con migraciones y datos de prueba (seed).
- Pendiente: servidor base (errores y layout), cuentas, verificación de correo, perfil, solicitudes, propuestas y reseñas.

## Flujo de trabajo

- Nunca hacer push directo a `main`; trabajar en ramas `feature/rf-XX-descripcion` y abrir Pull Request.
- Hacer `git pull` en `main` antes de crear una rama nueva.
- Si alguien agrega un paquete, los demás corren `npm install` después del pull.
- Los cambios al esquema van en una migración nueva en `db/migrations/`; nunca se edita una ya aplicada. Los demás corren `npm run migrate` después del pull.
