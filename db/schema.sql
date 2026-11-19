CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  contrasena_hash TEXT NOT NULL,
  rol TEXT CHECK(rol IN ('cliente','prestador')) NOT NULL
);

CREATE TABLE IF NOT EXISTS perfiles_prestador (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
  descripcion TEXT,
  zona_servicio TEXT,
  oficios TEXT
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES usuarios(id),
  oficio TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  zona TEXT NOT NULL,
  fecha_publicacion TEXT DEFAULT CURRENT_TIMESTAMP,
  estado TEXT CHECK(estado IN ('Publicada','Asignada','Completada','Cancelada')) DEFAULT 'Publicada'
);

CREATE TABLE IF NOT EXISTS propuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id),
  prestador_id INTEGER NOT NULL REFERENCES usuarios(id),
  precio REAL NOT NULL,
  disponibilidad TEXT NOT NULL,
  mensaje TEXT,
  fecha_envio TEXT DEFAULT CURRENT_TIMESTAMP,
  estado TEXT CHECK(estado IN ('Enviada','Aceptada','Rechazada')) DEFAULT 'Enviada',
  UNIQUE (solicitud_id, prestador_id)
);

CREATE TABLE IF NOT EXISTS resenas (
  solicitud_id INTEGER PRIMARY KEY REFERENCES solicitudes(id),
  calificacion INTEGER NOT NULL CHECK(calificacion BETWEEN 1 AND 5),
  comentario TEXT,
  fecha TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propuesta_id INTEGER REFERENCES propuestas(id),
  destinatario TEXT NOT NULL,
  asunto TEXT NOT NULL,
  estado_envio TEXT CHECK(estado_envio IN ('Enviado','Fallido')),
  fecha_envio TEXT DEFAULT CURRENT_TIMESTAMP
);
