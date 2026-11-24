const nodemailer = require('nodemailer');
const db = require('../db/db');
const log = require('../utils/log');
const Usuario = require('./Usuario');
const Notificacion = require('./Notificacion');

// propuesta que un prestador le manda a una solicitud publicada (rf-06, rf-07, rf-08)
class Propuesta {
  constructor(fila) {
    this.id = fila.id;
    this.solicitudId = fila.solicitud_id;
    this.prestadorId = fila.prestador_id;
    this.precio = fila.precio;
    this.disponibilidad = fila.disponibilidad;
    this.mensaje = fila.mensaje;
    this.fechaEnvio = fila.fecha_envio;
    this.estado = fila.estado;
    // solo vienen cuando se listan las propuestas de una solicitud
    this.prestadorNombre = fila.prestador_nombre;
    this.prestadorZona = fila.prestador_zona;
  }

  static buscarPorId(id) {
    const fila = db.prepare('SELECT * FROM propuestas WHERE id = ?').get(id);
    return fila ? new Propuesta(fila) : null;
  }

  // rf-07: propuestas que recibió una solicitud, con el nombre y la zona del prestador
  static deSolicitud(solicitudId) {
    return db
      .prepare(
        `SELECT p.*, u.nombre AS prestador_nombre, pp.zona_servicio AS prestador_zona
         FROM propuestas p
         JOIN usuarios u ON u.id = p.prestador_id
         LEFT JOIN perfiles_prestador pp ON pp.usuario_id = p.prestador_id
         WHERE p.solicitud_id = ?
         ORDER BY p.fecha_envio, p.id`,
      )
      .all(solicitudId)
      .map((fila) => new Propuesta(fila));
  }

  static yaEnvio(solicitudId, prestadorId) {
    return Boolean(
      db.prepare('SELECT 1 FROM propuestas WHERE solicitud_id = ? AND prestador_id = ?').get(solicitudId, prestadorId),
    );
  }

  // rf-06: valida y guarda la propuesta de un prestador para una solicitud (objeto SolicitudTrabajo).
  // regresa { errores, propuesta }: si hay errores, propuesta es null
  static async enviar(solicitud, prestadorId, precio, disponibilidad, mensaje) {
    const errores = [];

    if (solicitud.estado !== 'Publicada') {
      errores.push('Esta solicitud ya no recibe propuestas');
      return { errores, propuesta: null };
    }
    const yaExiste = db
      .prepare('SELECT id FROM propuestas WHERE solicitud_id = ? AND prestador_id = ?')
      .get(solicitud.id, prestadorId);
    if (yaExiste) {
      errores.push('Ya enviaste una propuesta a esta solicitud');
      return { errores, propuesta: null };
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      errores.push('Escribe un precio mayor a 0');
    } else if (precio > 1000000) {
      errores.push('El precio no puede ser mayor a 1,000,000');
    }
    if (!disponibilidad || disponibilidad.trim() === '') {
      errores.push('Indica cuándo puedes hacer el trabajo');
    } else if (disponibilidad.trim().length > 100) {
      errores.push('La disponibilidad debe tener como máximo 100 caracteres');
    }
    if (mensaje && mensaje.trim().length > 500) {
      errores.push('El mensaje debe tener como máximo 500 caracteres');
    }
    if (errores.length > 0) return { errores, propuesta: null };

    const texto = mensaje && mensaje.trim() !== '' ? mensaje.trim() : null;
    const resultado = db
      .prepare(
        `INSERT INTO propuestas (solicitud_id, prestador_id, precio, disponibilidad, mensaje, estado)
         VALUES (?, ?, ?, ?, ?, 'Enviada')`,
      )
      .run(solicitud.id, prestadorId, precio, disponibilidad.trim(), texto);
    const propuesta = Propuesta.buscarPorId(Number(resultado.lastInsertRowid));

    // rf-13: avisarle al cliente que llegó una propuesta
    const cliente = Usuario.buscarPorId(solicitud.clienteId);
    const asunto = 'Recibiste una propuesta para tu solicitud de ' + solicitud.oficio;
    let estadoEnvio = 'Fallido';
    try {
      if (!process.env.SMTP_HOST) throw new Error('falta SMTP_HOST en el .env');
      const transporte = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      });
      await transporte.sendMail({
        from: process.env.MAIL_FROM || 'ServiCerca <no-reply@servicerca.local>',
        to: cliente.correo,
        subject: asunto,
        text: `Hola, ${cliente.nombre}:\n\n`
          + `Un prestador te mandó una propuesta de $${precio} para tu solicitud "${solicitud.descripcion}".\n`
          + `Disponibilidad: ${disponibilidad.trim()}\n\n`
          + `Entra a ServiCerca para verla y aceptarla: ${process.env.APP_URL || 'http://localhost:3000'}/solicitudes/${solicitud.id}\n`,
      });
      estadoEnvio = 'Enviado';
    } catch (err) {
      log.aviso('No se pudo enviar el aviso de propuesta recibida: ' + err.message);
    }
    Notificacion.registrar(propuesta.id, cliente.correo, asunto, estadoEnvio);

    return { errores: [], propuesta };
  }

  // rf-08: el cliente acepta esta propuesta. la solicitud pasa a asignada y las demás propuestas quedan rechazadas.
  // regresa el mensaje de error, o null si se aceptó
  async aceptar(usuarioId) {
    const solicitud = db.prepare('SELECT id, cliente_id, estado FROM solicitudes WHERE id = ?').get(this.solicitudId);
    if (solicitud.cliente_id !== usuarioId) {
      return 'No tienes permiso para aceptar esta propuesta';
    }
    if (solicitud.estado !== 'Publicada') {
      return 'Esta solicitud ya tiene una propuesta aceptada o ya no está publicada';
    }
    if (this.estado !== 'Enviada') {
      return 'Esta propuesta ya no se puede aceptar';
    }

    const aceptarTodo = db.transaction(() => {
      db.prepare("UPDATE propuestas SET estado = 'Aceptada' WHERE id = ?").run(this.id);
      db.prepare(
        "UPDATE propuestas SET estado = 'Rechazada' WHERE solicitud_id = ? AND id <> ? AND estado = 'Enviada'",
      ).run(this.solicitudId, this.id);
      db.prepare("UPDATE solicitudes SET estado = 'Asignada' WHERE id = ?").run(this.solicitudId);
    });
    aceptarTodo();
    this.estado = 'Aceptada';

    // rf-13: avisarle al prestador que aceptaron su propuesta
    const prestador = Usuario.buscarPorId(this.prestadorId);
    const asunto = 'Aceptaron tu propuesta en ServiCerca';
    let estadoEnvio = 'Fallido';
    try {
      if (!process.env.SMTP_HOST) throw new Error('falta SMTP_HOST en el .env');
      const transporte = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        connectionTimeout: 10000,
        socketTimeout: 15000,
      });
      await transporte.sendMail({
        from: process.env.MAIL_FROM || 'ServiCerca <no-reply@servicerca.local>',
        to: prestador.correo,
        subject: asunto,
        text: `Hola, ${prestador.nombre}:\n\n`
          + `El cliente aceptó tu propuesta de $${this.precio}. Ponte de acuerdo con él para hacer el trabajo.\n\n`
          + `Puedes verla en tu historial: ${process.env.APP_URL || 'http://localhost:3000'}/historial/propuestas/${this.id}\n`,
      });
      estadoEnvio = 'Enviado';
    } catch (err) {
      log.aviso('No se pudo enviar el aviso de propuesta aceptada: ' + err.message);
    }
    Notificacion.registrar(this.id, prestador.correo, asunto, estadoEnvio);

    return null;
  }

  // lo usa la vista para mostrar el botón de aceptar
  puedeAceptarse() {
    return this.estado === 'Enviada';
  }

  fechaCorta() {
    return this.fechaEnvio.slice(0, 10);
  }
}

module.exports = Propuesta;
