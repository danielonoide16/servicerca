const db = require('../db/db');
const Contrasena = require('./Contrasena');

// Cuenta de un cliente, un prestador o un administrador (RF-01, RF-02)
class Usuario {
  constructor(id, nombre, correo, contrasenaHash, rol, emailVerificado) {
    this.id = id;
    this.nombre = nombre;
    this.correo = correo;
    this.contrasenaHash = contrasenaHash;
    this.rol = rol;
    this.emailVerificado = emailVerificado;
  }

  static desdeFila(fila) {
    if (!fila) return null;
    return new Usuario(fila.id, fila.nombre, fila.correo, fila.contrasena_hash, fila.rol, Boolean(fila.email_verificado));
  }

  static buscarPorId(id) {
    const fila = db
      .prepare('SELECT id, nombre, correo, contrasena_hash, rol, email_verificado FROM usuarios WHERE id = ?')
      .get(id);
    return Usuario.desdeFila(fila);
  }

  static buscarPorCorreo(correo) {
    const fila = db
      .prepare('SELECT id, nombre, correo, contrasena_hash, rol, email_verificado FROM usuarios WHERE correo = ?')
      .get(correo);
    return Usuario.desdeFila(fila);
  }

  static existeCorreo(correo) {
    return Boolean(db.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo));
  }

  // RF-01: crea la cuenta con la contraseña cifrada
  static async registrar(nombre, correo, contrasena, rol) {
    const contrasenaHash = await Contrasena.cifrar(contrasena);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)')
      .run(nombre, correo, contrasenaHash, rol);
    return Usuario.buscarPorId(Number(lastInsertRowid));
  }

  // RF-02: regresa el usuario si el correo y la contraseña coinciden, o null si no
  static async buscarPorCredenciales(correo, contrasena) {
    const usuario = Usuario.buscarPorCorreo(correo);
    if (!usuario) {
      await Contrasena.compararConFalso(contrasena);
      return null;
    }
    const coincide = await usuario.autenticar(contrasena);
    return coincide ? usuario : null;
  }

  async autenticar(contrasena) {
    return Contrasena.coincide(contrasena, this.contrasenaHash);
  }

  marcarCorreoVerificado() {
    db.prepare('UPDATE usuarios SET email_verificado = 1 WHERE id = ?').run(this.id);
    this.emailVerificado = true;
  }

  actualizarContrasena(contrasenaHash) {
    db.prepare('UPDATE usuarios SET contrasena_hash = ? WHERE id = ?').run(contrasenaHash, this.id);
    this.contrasenaHash = contrasenaHash;
  }

  // Lo que se guarda en req.user y llega a las vistas: nunca incluye el hash de la contraseña
  datosPublicos() {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      rol: this.rol,
      emailVerificado: this.emailVerificado,
    };
  }
}

module.exports = Usuario;
