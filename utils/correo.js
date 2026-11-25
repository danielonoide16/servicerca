const CorreoNodemailer = require('../clases/CorreoNodemailer');
const log = require('./log');

const servicioCorreo = new CorreoNodemailer();

// correos con enlace de un solo uso: verificación de correo y restablecer contraseña
async function enviarCorreo(para, asunto, nombre, enlace, vigencia, tipo, textoBoton) {
  let intro = '';
  let nota = '';
  if (tipo === 'verificacion') {
    intro = 'Gracias por registrarte en ServiCerca. Para publicar solicitudes o enviar propuestas necesitamos confirmar que este correo es tuyo.';
    nota = 'Si no creaste una cuenta, puedes ignorar este mensaje.';
  } else if (tipo === 'restablecer') {
    intro = 'Recibimos una solicitud para restablecer la contraseña de tu cuenta.';
    nota = 'Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.';
  }
  // solo en desarrollo y sin smtp: deja el enlace en la consola para poder probar sin servidor de correo
  if (!servicioCorreo.estaConfigurado() && process.env.NODE_ENV !== 'production') {
    log.aviso('Enlace (solo desarrollo, sin SMTP): ' + enlace);
  }
  const parrafos = [intro, `El enlace es válido por ${vigencia} y solo puede usarse una vez.`];
  return servicioCorreo.enviar(para, asunto, { nombre, parrafos, enlace, textoBoton, nota }, tipo);
}

module.exports = { enviarCorreo };
