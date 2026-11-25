// interfaz para mandar correos (dip). javascript no tiene interfaces, así que es una clase base
// que solo define el método que debe tener cada implementación. las clases que mandan avisos
// dependen de esta interfaz y no de nodemailer
class ServicioCorreo {
  // contenido = { nombre, parrafos: [texto, ...], enlace, textoBoton, nota }
  // regresa true si el correo se envió y false si no. nunca lanza errores
  async enviar(para, asunto, contenido, tipo) {
    throw new Error('enviar() no está implementado');
  }

  // true si el servicio tiene lo necesario para mandar correos
  estaConfigurado() {
    return false;
  }
}

module.exports = ServicioCorreo;
