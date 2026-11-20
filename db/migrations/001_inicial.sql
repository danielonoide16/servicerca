-- 001_inicial: modelo relacional de ServiCerca
-- Borrado físico: las dependencias usan ON DELETE CASCADE; el catálogo de oficios, RESTRICT.

-- Catálogo
CREATE TABLE oficios (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT INTO oficios (nombre) VALUES
  ('Plomería'), ('Electricidad'), ('Carpintería'),
  ('Jardinería'), ('Pintura'), ('Albañilería');

-- Usuarios y perfil del prestador
CREATE TABLE usuarios (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre           TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
  correo           TEXT NOT NULL UNIQUE COLLATE NOCASE,                 -- RN-01
  contrasena_hash  TEXT NOT NULL,                                       -- bcrypt
  rol              TEXT NOT NULL DEFAULT 'cliente'
                   CHECK (rol IN ('cliente', 'prestador', 'admin')),
  email_verificado INTEGER NOT NULL DEFAULT 0 CHECK (email_verificado IN (0, 1)),
  fecha_registro   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Composición 1 : 0..1 con usuarios (RF-03)
CREATE TABLE perfiles_prestador (
  usuario_id    INTEGER PRIMARY KEY
                REFERENCES usuarios (id) ON DELETE CASCADE,
  descripcion   TEXT,
  zona_servicio TEXT NOT NULL CHECK (length(trim(zona_servicio)) > 0)
);

-- N:M perfil <-> oficios
CREATE TABLE perfil_oficios (
  usuario_id INTEGER NOT NULL
             REFERENCES perfiles_prestador (usuario_id) ON DELETE CASCADE,
  oficio_id  INTEGER NOT NULL
             REFERENCES oficios (id) ON DELETE RESTRICT,
  PRIMARY KEY (usuario_id, oficio_id)
);

-- Tokens de un solo uso (verificación de correo y restablecer contraseña).
-- Solo se guarda el hash sha256; el token en claro viaja únicamente en el correo.
CREATE TABLE tokens_un_solo_uso (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL
             REFERENCES usuarios (id) ON DELETE CASCADE,
  proposito  TEXT NOT NULL CHECK (proposito IN ('verify-email', 'reset-password')),
  token_hash TEXT NOT NULL UNIQUE,
  expira_en  TEXT NOT NULL,
  usado_en   TEXT,
  creado_en  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Solicitudes, propuestas y reseñas
CREATE TABLE solicitudes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id        INTEGER NOT NULL
                    REFERENCES usuarios (id) ON DELETE CASCADE,
  oficio_id         INTEGER NOT NULL
                    REFERENCES oficios (id) ON DELETE RESTRICT,
  descripcion       TEXT NOT NULL CHECK (length(trim(descripcion)) > 0),
  zona              TEXT NOT NULL CHECK (length(trim(zona)) > 0),
  fecha_publicacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado            TEXT NOT NULL DEFAULT 'Publicada'
                    CHECK (estado IN ('Publicada', 'Asignada', 'Completada', 'Cancelada'))  -- RN-06
);

CREATE TABLE propuestas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitud_id   INTEGER NOT NULL
                 REFERENCES solicitudes (id) ON DELETE CASCADE,
  prestador_id   INTEGER NOT NULL
                 REFERENCES usuarios (id) ON DELETE CASCADE,
  precio         REAL NOT NULL CHECK (precio >= 0),
  disponibilidad TEXT NOT NULL CHECK (length(trim(disponibilidad)) > 0),
  mensaje        TEXT,
  fecha_envio    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado         TEXT NOT NULL DEFAULT 'Enviada'
                 CHECK (estado IN ('Enviada', 'Aceptada', 'Rechazada')),
  UNIQUE (solicitud_id, prestador_id)                                    -- RN-03
);

-- RN-04: como máximo una propuesta Aceptada por solicitud
CREATE UNIQUE INDEX ux_propuesta_aceptada
  ON propuestas (solicitud_id) WHERE estado = 'Aceptada';

-- Composición 1 : 0..1 con solicitudes (RN-05)
CREATE TABLE resenas (
  solicitud_id INTEGER PRIMARY KEY
               REFERENCES solicitudes (id) ON DELETE CASCADE,
  calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario   TEXT,
  fecha        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notificaciones por correo (RF-13)
CREATE TABLE notificaciones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  propuesta_id INTEGER NOT NULL
               REFERENCES propuestas (id) ON DELETE CASCADE,
  destinatario TEXT NOT NULL,
  asunto       TEXT NOT NULL,
  estado_envio TEXT NOT NULL CHECK (estado_envio IN ('Enviado', 'Fallido')),
  fecha_envio  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de apoyo (búsqueda RF-05, historial RF-12, llaves foráneas)
CREATE INDEX ix_solicitudes_busqueda ON solicitudes (estado, oficio_id, zona);
CREATE INDEX ix_solicitudes_cliente  ON solicitudes (cliente_id);
CREATE INDEX ix_propuestas_prestador ON propuestas (prestador_id);
CREATE INDEX ix_notif_propuesta      ON notificaciones (propuesta_id);
CREATE INDEX ix_perfil_oficios_ofi   ON perfil_oficios (oficio_id);
CREATE INDEX ix_tokens_usuario       ON tokens_un_solo_uso (usuario_id, proposito);
