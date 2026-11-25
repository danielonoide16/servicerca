const bcrypt = require('bcryptjs');

const COSTO = 10;
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
}

module.exports = Contrasena;
