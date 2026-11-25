const nodemailer = require('nodemailer');
const log = require('./log');

const transporte = process.env.SMTP_HOST
  ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  })
  : null;

const APP_URL = () => process.env.APP_URL || 'http://localhost:3000';

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Todos los correos usan la misma plantilla.
// contenido = { nombre, parrafos: [texto, ...], enlace, textoBoton, nota }
function armarHtml({ nombre, parrafos, enlace, textoBoton, nota }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ServiCerca</title>
</head>
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#1d2733;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d5dce4;border-radius:6px;">
    <div style="background:#1f5f8b;color:#ffffff;padding:16px 24px;font-size:20px;font-weight:bold;">ServiCerca</div>
    <div style="padding:24px;line-height:1.5;">
      <p>Hola, ${escapar(nombre)}:</p>
      ${parrafos.map((p) => `<p>${escapar(p)}</p>`).join('\n      ')}
      <p style="margin:24px 0;"><a href="${escapar(enlace)}" style="display:inline-block;background:#1f5f8b;color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;">${escapar(textoBoton)}</a></p>
      <p style="font-size:13px;color:#5d6b7a;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="font-size:13px;color:#5d6b7a;word-break:break-all;">${escapar(enlace)}</p>
      <p style="font-size:13px;color:#5d6b7a;">${escapar(nota)}</p>
    </div>
  </div>
</body>
</html>`;
}

function armarTexto({ nombre, parrafos, enlace, textoBoton, nota }) {
  return `Hola, ${nombre}:\n\n${parrafos.join('\n\n')}\n\n${textoBoton}: ${enlace}\n\n${nota}\n\n— El equipo de ServiCerca`;
}

// Envía un correo con la plantilla de ServiCerca. Nunca lanza errores: si falla, lo deja en la consola.
// Regresa true si el servidor SMTP lo aceptó y false si no (sin configurar o con error).
async function enviarAviso(para, asunto, contenido, tipo) {
  try {
    if (!transporte) {
      log.aviso('Correo no configurado: falta SMTP_HOST en el .env');
      return false;
    }
    await transporte.sendMail({
      from: process.env.MAIL_FROM || 'ServiCerca <no-reply@servicerca.local>',
      to: para,
      subject: asunto,
      html: armarHtml(contenido),
      text: armarTexto(contenido),
    });
    log.info('Correo enviado (' + tipo + ')');
    return true;
  } catch (err) {
    log.aviso('No se pudo enviar el correo (' + tipo + '): ' + err.message);
    return false;
  }
}

// Correos con enlace de un solo uso: verificación de correo y restablecer contraseña
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
  // Solo en desarrollo y sin SMTP: deja el enlace en la consola para poder probar sin servidor de correo
  if (!transporte && process.env.NODE_ENV !== 'production') {
    log.aviso('Enlace (solo desarrollo, sin SMTP): ' + enlace);
  }
  const parrafos = [intro, `El enlace es válido por ${vigencia} y solo puede usarse una vez.`];
  return enviarAviso(para, asunto, { nombre, parrafos, enlace, textoBoton, nota }, tipo);
}

module.exports = { enviarCorreo, enviarAviso, APP_URL };
