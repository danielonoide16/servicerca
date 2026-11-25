const nodemailer = require('nodemailer');
const ServicioCorreo = require('./ServicioCorreo');
const { armarHtml, armarTexto } = require('../utils/plantillaCorreo');
const log = require('../utils/log');

// implementación de ServicioCorreo con nodemailer y smtp. es el único lugar del sistema que usa nodemailer
class CorreoNodemailer extends ServicioCorreo {
  // la configuración sale del .env
  constructor() {
    super();
    this.remitente = process.env.MAIL_FROM || 'ServiCerca <no-reply@servicerca.local>';
    this.transporte = process.env.SMTP_HOST
      ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      })
      : null;
  }

  estaConfigurado() {
    return this.transporte !== null;
  }

  async enviar(para, asunto, contenido, tipo) {
    try {
      if (!this.transporte) {
        log.aviso('Correo no configurado: falta SMTP_HOST en el .env');
        return false;
      }
      await this.transporte.sendMail({
        from: this.remitente,
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
}

module.exports = CorreoNodemailer;
