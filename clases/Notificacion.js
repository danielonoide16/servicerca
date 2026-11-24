const db = require('../db/db');

// aviso por correo que se manda cuando llega una propuesta o cuando se acepta (rf-13)
class Notificacion {
  constructor(id, propuestaId, destinatario, asunto, estadoEnvio, fechaEnvio) {
    this.id = id;
    this.propuestaId = propuestaId;
    this.destinatario = destinatario;
    this.asunto = asunto;
    this.estadoEnvio = estadoEnvio; // 'Enviado' o 'Fallido'
    this.fechaEnvio = fechaEnvio;
  }

  static registrar(propuestaId, destinatario, asunto, estadoEnvio) {
    const resultado = db
      .prepare('INSERT INTO notificaciones (propuesta_id, destinatario, asunto, estado_envio) VALUES (?, ?, ?, ?)')
      .run(propuestaId, destinatario, asunto, estadoEnvio);
    const fila = db.prepare('SELECT * FROM notificaciones WHERE id = ?').get(Number(resultado.lastInsertRowid));
    return new Notificacion(fila.id, fila.propuesta_id, fila.destinatario, fila.asunto, fila.estado_envio, fila.fecha_envio);
  }

  static dePropuesta(propuestaId) {
    return db
      .prepare('SELECT * FROM notificaciones WHERE propuesta_id = ? ORDER BY id')
      .all(propuestaId)
      .map((f) => new Notificacion(f.id, f.propuesta_id, f.destinatario, f.asunto, f.estado_envio, f.fecha_envio));
  }
}

module.exports = Notificacion;
