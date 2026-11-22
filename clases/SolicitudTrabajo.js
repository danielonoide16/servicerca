const db = require('../db/db');
const { ESTADOS_SOLICITUD, ESTADOS_PROPUESTA } = require('../db/tipos');

// Límites de los datos de una solicitud y de la búsqueda
const LIMITES = {
  DESCRIPCION_MIN: 10,
  DESCRIPCION_MAX: 500,
  ZONA_MAX: 100,
  RESULTADOS_BUSQUEDA: 50,
};

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

    if (!descripcion || descripcion.trim().length < LIMITES.DESCRIPCION_MIN) {
      errores.push(`Describe el trabajo con al menos ${LIMITES.DESCRIPCION_MIN} caracteres`);
    } else if (descripcion.trim().length > LIMITES.DESCRIPCION_MAX) {
      errores.push(`La descripción debe tener como máximo ${LIMITES.DESCRIPCION_MAX} caracteres`);
    }

    if (!zona || zona.trim() === '') {
      errores.push('La zona es obligatoria');
    } else if (zona.trim().length > LIMITES.ZONA_MAX) {
      errores.push(`La zona debe tener como máximo ${LIMITES.ZONA_MAX} caracteres`);
    }

    if (errores.length > 0) return { errores, solicitud: null };

    const resultado = db
      .prepare(
        `INSERT INTO solicitudes (cliente_id, oficio_id, descripcion, zona, estado)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(clienteId, oficioId, descripcion.trim(), zona.trim(), ESTADOS_SOLICITUD.PUBLICADA);

    return { errores: [], solicitud: SolicitudTrabajo.buscarPorId(Number(resultado.lastInsertRowid)) };
  }

  // RF-05: solicitudes publicadas, filtradas por oficio y por zona (los dos son opcionales)
  static buscar(oficioId, zona) {
    let sql = `SELECT s.*, o.nombre AS oficio
               FROM solicitudes s
               JOIN oficios o ON o.id = s.oficio_id
               WHERE s.estado = ?`;
    const parametros = [ESTADOS_SOLICITUD.PUBLICADA];

    if (oficioId) {
      sql += ' AND s.oficio_id = ?';
      parametros.push(oficioId);
    }
    if (zona && zona.trim() !== '') {
      if (zona.trim().length > LIMITES.ZONA_MAX) {
        zona = zona.trim().slice(0, LIMITES.ZONA_MAX);
      }
      sql += ' AND s.zona LIKE ?';
      parametros.push('%' + zona.trim() + '%');
    }
    sql += ' ORDER BY s.fecha_publicacion DESC, s.id DESC LIMIT ?';
    parametros.push(LIMITES.RESULTADOS_BUSQUEDA);

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
    if (this.estado !== ESTADOS_SOLICITUD.ASIGNADA) {
      return 'Solo puedes marcar como completada una solicitud asignada';
    }

    db.prepare('UPDATE solicitudes SET estado = ? WHERE id = ?').run(ESTADOS_SOLICITUD.COMPLETADA, this.id);
    this.estado = ESTADOS_SOLICITUD.COMPLETADA;
    return null;
  }

  // RF-10: el cliente cancela una solicitud publicada o asignada.
  // Las propuestas que seguían en espera quedan rechazadas.
  cancelar(usuarioId) {
    if (this.clienteId !== usuarioId) {
      return 'No tienes permiso para modificar esta solicitud';
    }
    if (this.estado !== ESTADOS_SOLICITUD.PUBLICADA && this.estado !== ESTADOS_SOLICITUD.ASIGNADA) {
      return 'Solo puedes cancelar una solicitud publicada o asignada';
    }

    const cancelarTodo = db.transaction(() => {
      db.prepare('UPDATE solicitudes SET estado = ? WHERE id = ?').run(ESTADOS_SOLICITUD.CANCELADA, this.id);
      db.prepare('UPDATE propuestas SET estado = ? WHERE solicitud_id = ? AND estado = ?')
        .run(ESTADOS_PROPUESTA.RECHAZADA, this.id, ESTADOS_PROPUESTA.ENVIADA);
    });
    cancelarTodo();
    this.estado = ESTADOS_SOLICITUD.CANCELADA;
    return null;
  }

  // Lo usan las vistas para mostrar u ocultar los botones
  puedeCompletarse() {
    return this.estado === ESTADOS_SOLICITUD.ASIGNADA;
  }

  puedeCancelarse() {
    return this.estado === ESTADOS_SOLICITUD.PUBLICADA || this.estado === ESTADOS_SOLICITUD.ASIGNADA;
  }

  puedeResenarse() {
    return this.estado === ESTADOS_SOLICITUD.COMPLETADA;
  }

  fechaCorta() {
    return this.fechaPublicacion.slice(0, 10);
  }
}

module.exports = SolicitudTrabajo;
module.exports.LIMITES = LIMITES;
