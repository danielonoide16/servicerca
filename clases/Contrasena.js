const bcrypt = require('bcryptjs');

const COSTO = 10;
const MINIMO_CARACTERES = 8;
const MAXIMO_BYTES = 72; // bcrypt ignora lo que pase de 72 bytes
// Se compara contra este hash cuando el correo no existe, para que ambos casos tarden parecido
const HASH_FALSO = bcrypt.hashSync('contrasena-de-relleno', COSTO);

// Todo lo que tiene que ver con la contraseña: cifrarla, compararla y revisar sus reglas (RF-01, RF-02)
class Contrasena {
  static cifrar(contrasena) {
    return bcrypt.hash(contrasena, COSTO);
  }

  static coincide(contrasena, hash) {
    return bcrypt.compare(contrasena, hash);
  }

  static compararConFalso(contrasena) {
    return bcrypt.compare(contrasena, HASH_FALSO);
  }

  // Regresa el texto del primer error que tenga la contraseña, o null si cumple las reglas
  static errorDe(contrasena) {
    if (contrasena.length < MINIMO_CARACTERES) {
      return 'La contraseña debe tener al menos ' + MINIMO_CARACTERES + ' caracteres';
    }
    if (Buffer.byteLength(contrasena, 'utf8') > MAXIMO_BYTES) {
      return 'La contraseña debe tener como máximo ' + MAXIMO_BYTES + ' caracteres';
    }
    if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
      return 'La contraseña debe incluir al menos una letra y un número';
    }
    return null;
  }
}

module.exports = Contrasena;
