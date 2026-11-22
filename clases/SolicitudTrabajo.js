const db = require('../db/db');

// Trabajo que publica un cliente para que los prestadores le manden propuestas.
// RF-04 publicar, RF-05 buscar, RF-09 completar y RF-10 cancelar.
class SolicitudTrabajo {
  constructor(fila) {
    this.id = fila.id;
    this.clienteId = fila.cliente_id;
    this.oficioId = fila.oficio_id;
    this.oficio = fila.oficio; // nombre del oficio
    this.descripcion = fila.descripcion;
    this.zona = fila.zona;
    this.fechaPublicacion = fila.fecha_publicacion;
    this.estado = fila.estado;
  }

  // RF-04: valida los datos y publica la solicitud.
  // Regresa { errores, solicitud }: si hay errores, solicitud es null.
  static publicar(clienteId, oficioId, descripcion, zona) {
    const errores = [];

    if (!oficioId) {
      errores.push('Elige el oficio que necesitas');
    } else {
      const oficios = db.prepare('SELECT id, nombre FROM oficios ORDER BY nombre').all();
      if (!oficios.some((o) => o.id === oficioId)) {
        errores.push('El oficio elegido no existe');
      }
    }

    if (!descripcion || descripcion.trim().length < 10) {
      errores.push('Describe el trabajo con al menos 10 caracteres');
    } else if (descripcion.trim().length > 500) {
      errores.push('La descripción debe tener como máximo 500 caracteres');
    }

    if (!zona || zona.trim() === '') {
      errores.push('La zona es obligatoria');
    } else if (zona.trim().length > 100) {
      errores.push('La zona debe tener como máximo 100 caracteres');
    }

    if (errores.length > 0) return { errores, solicitud: null };

    const resultado = db
      .prepare(
        `INSERT INTO solicitudes (cliente_id, oficio_id, descripcion, zona, estado)
         VALUES (?, ?, ?, ?, 'Publicada')`,
      )
      .run(clienteId, oficioId, descripcion.trim(), zona.trim());

    return { errores: [], solicitud: SolicitudTrabajo.buscarPorId(Number(resultado.lastInsertRowid)) };
  }

  // RF-05: solicitudes publicadas, filtradas por oficio y por zona (los dos son opcionales)
  static buscar(oficioId, zona) {
    let sql = `SELECT s.*, o.nombre AS oficio
               FROM solicitudes s
               JOIN oficios o ON o.id = s.oficio_id
               WHERE s.estado = 'Publicada'`;
    const parametros = [];

    if (oficioId) {
      sql += ' AND s.oficio_id = ?';
      parametros.push(oficioId);
    }
    if (zona && zona.trim() !== '') {
      if (zona.trim().length > 100) {
        zona = zona.trim().slice(0, 100);
      }
      sql += ' AND s.zona LIKE ?';
      parametros.push('%' + zona.trim() + '%');
    }
    sql += ' ORDER BY s.fecha_publicacion DESC, s.id DESC LIMIT 50';

    return db.prepare(sql).all(...parametros).map((fila) => new SolicitudTrabajo(fila));
  }

  static buscarPorId(id) {
    const fila = db
      .prepare(
        `SELECT s.*, o.nombre AS oficio
         FROM solicitudes s
         JOIN oficios o ON o.id = s.oficio_id
         WHERE s.id = ?`,
      )
      .get(id);
    return fila ? new SolicitudTrabajo(fila) : null;
  }

  // Solicitudes de un cliente, de la más nueva a la más vieja
  static delCliente(clienteId) {
    return db
      .prepare(
        `SELECT s.*, o.nombre AS oficio
         FROM solicitudes s
         JOIN oficios o ON o.id = s.oficio_id
         WHERE s.cliente_id = ?
         ORDER BY s.fecha_publicacion DESC, s.id DESC`,
      )
      .all(clienteId)
      .map((fila) => new SolicitudTrabajo(fila));
  }

  // Para los selectores de oficio del formulario y del buscador
  static catalogoOficios() {
    return db.prepare('SELECT id, nombre FROM oficios ORDER BY nombre').all();
  }

  // RF-09: el cliente marca como completada una solicitud asignada.
  // Regresa el mensaje de error, o null si se completó.
  completar(usuarioId) {
    if (this.clienteId !== usuarioId) {
      return 'No tienes permiso para modificar esta solicitud';
    }
    if (this.estado !== 'Asignada') {
      return 'Solo puedes marcar como completada una solicitud asignada';
    }

    db.prepare("UPDATE solicitudes SET estado = 'Completada' WHERE id = ?").run(this.id);
    this.estado = 'Completada';
    return null;
  }

  // RF-10: el cliente cancela una solicitud publicada o asignada.
  // Las propuestas que seguían en espera quedan rechazadas.
  cancelar(usuarioId) {
    if (this.clienteId !== usuarioId) {
      return 'No tienes permiso para modificar esta solicitud';
    }
    if (this.estado !== 'Publicada' && this.estado !== 'Asignada') {
      return 'Solo puedes cancelar una solicitud publicada o asignada';
    }

    const cancelarTodo = db.transaction(() => {
      db.prepare("UPDATE solicitudes SET estado = 'Cancelada' WHERE id = ?").run(this.id);
      db.prepare(
        "UPDATE propuestas SET estado = 'Rechazada' WHERE solicitud_id = ? AND estado = 'Enviada'",
      ).run(this.id);
    });
    cancelarTodo();
    this.estado = 'Cancelada';
    return null;
  }

  // Lo usan las vistas para mostrar u ocultar los botones
  puedeCompletarse() {
    return this.estado === 'Asignada';
  }

  puedeCancelarse() {
    return this.estado === 'Publicada' || this.estado === 'Asignada';
  }

  puedeResenarse() {
    return this.estado === 'Completada';
  }

  fechaCorta() {
    return this.fechaPublicacion.slice(0, 10);
  }
}

module.exports = SolicitudTrabajo;
