const db = require('./db');

// Forma pública del usuario: nunca incluye el hash de la contraseña
const aUsuario = (fila) =>
  fila && {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    rol: fila.rol,
    emailVerificado: Boolean(fila.email_verificado),
  };

const COLUMNAS = 'id, nombre, correo, rol, email_verificado';

const buscarPorId = (id) =>
  aUsuario(db.prepare(`SELECT ${COLUMNAS} FROM usuarios WHERE id = ?`).get(id));

const crear = ({ nombre, correo, contrasenaHash, rol }) => {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)')
    .run(nombre, correo, contrasenaHash, rol);
  return buscarPorId(Number(lastInsertRowid));
};

// Incluye el hash: solo para iniciar sesión
const buscarParaLogin = (correo) => {
  const fila = db.prepare(`SELECT ${COLUMNAS}, contrasena_hash FROM usuarios WHERE correo = ?`).get(correo);
  return fila && { ...aUsuario(fila), contrasenaHash: fila.contrasena_hash };
};

const existeCorreo = (correo) =>
  Boolean(db.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo));

module.exports = { aUsuario, crear, buscarPorId, buscarParaLogin, existeCorreo };
