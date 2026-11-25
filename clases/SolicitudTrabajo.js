const db = require('../db/db');
const { ESTADOS_SOLICITUD, ESTADOS_PROPUESTA } = require('../db/tipos');

// Límites de los datos de una solicitud y de la búsqueda
const LIMITES = {
  DESCRIPCION_MIN: 10,
  DESCRIPCION_MAX: 500,
  ZONA_MAX: 100,
  RESULTADOS_BUSQUEDA: 50,
};

// Consulta base: la solicitud con el nombre de su oficio
const SELECT_SOLICITUD = `SELECT s.*, o.nombre AS oficio
  FROM solicitudes s
  JOIN oficios o ON o.id = s.oficio_id`;

// ---------- Funciones auxiliares (no usan el estado de una solicitud) ----------

function existeOficio(oficioId) {
  return Boolean(db.prepare('SELECT 1 FROM oficios WHERE id = ?').get(oficioId));
}

// Regresa la lista de errores de los datos de una solicitud nueva (vacía si son válidos)
function validarDatos(oficioId, descripcion, zona) {
  const errores = [];

  if (!oficioId) {
    errores.push('Elige el oficio que necesitas');
  } else if (!existeOficio(oficioId)) {
    errores.push('El oficio elegido no existe');
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

  return errores;
}

// Arma las condiciones del WHERE de la búsqueda (RF-05) y sus parámetros
function armarFiltros(oficioId, zona) {
  const condiciones = ['s.estado = ?'];
  const parametros = [ESTADOS_SOLICITUD.PUBLICADA];

  if (oficioId) {
    condiciones.push('s.oficio_id = ?');
    parametros.push(oficioId);
  }
  const zonaLimpia = (zona || '').trim().slice(0, LIMITES.ZONA_MAX);
  if (zonaLimpia !== '') {
    condiciones.push('s.zona LIKE ?');
    parametros.push('%' + zonaLimpia + '%');
  }

  return { condiciones, parametros };
}

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
    const errores = validarDatos(oficioId, descripcion, zona);
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
    const { condiciones, parametros } = armarFiltros(oficioId, zona);
    return db
      .prepare(
        `${SELECT_SOLICITUD}
         WHERE ${condiciones.join(' AND ')}
         ORDER BY s.fecha_publicacion DESC, s.id DESC
         LIMIT ?`,
      )
      .all(...parametros, LIMITES.RESULTADOS_BUSQUEDA)
      .map((fila) => new SolicitudTrabajo(fila));
  }

  static buscarPorId(id) {
    const fila = db.prepare(`${SELECT_SOLICITUD} WHERE s.id = ?`).get(id);
    return fila ? new SolicitudTrabajo(fila) : null;
  }

  // Solicitudes de un cliente, de la más nueva a la más vieja
  static delCliente(clienteId) {
    return db
      .prepare(`${SELECT_SOLICITUD} WHERE s.cliente_id = ? ORDER BY s.fecha_publicacion DESC, s.id DESC`)
      .all(clienteId)
      .map((fila) => new SolicitudTrabajo(fila));
  }

  // RF-09: el cliente marca como completada una solicitud asignada.
  // Regresa el mensaje de error, o null si se completó.
  completar(usuarioId) {
    if (this.clienteId !== usuarioId) {
      return 'No tienes permiso para modificar esta solicitud';
    }
    if (!this.puedeCompletarse()) {
      return 'Solo puedes marcar como completada una solicitud asignada';
    }

    this.cambiarEstado(ESTADOS_SOLICITUD.COMPLETADA);
    return null;
  }

  // RF-10: el cliente cancela una solicitud publicada o asignada.
  // Las propuestas que seguían en espera quedan rechazadas.
  cancelar(usuarioId) {
    if (this.clienteId !== usuarioId) {
      return 'No tienes permiso para modificar esta solicitud';
    }
    if (!this.puedeCancelarse()) {
      return 'Solo puedes cancelar una solicitud publicada o asignada';
    }

    db.transaction(() => {
      this.cambiarEstado(ESTADOS_SOLICITUD.CANCELADA);
      db.prepare('UPDATE propuestas SET estado = ? WHERE solicitud_id = ? AND estado = ?')
        .run(ESTADOS_PROPUESTA.RECHAZADA, this.id, ESTADOS_PROPUESTA.ENVIADA);
    })();
    return null;
  }

  // Reglas de RN-06: de qué estado se puede pasar a cuál
  puedeCompletarse() {
    return this.estado === ESTADOS_SOLICITUD.ASIGNADA;
  }

  puedeCancelarse() {
    return this.estado === ESTADOS_SOLICITUD.PUBLICADA || this.estado === ESTADOS_SOLICITUD.ASIGNADA;
  }

  puedeResenarse() {
    return this.estado === ESTADOS_SOLICITUD.COMPLETADA;
  }

  // Guarda el nuevo estado en la base y en el objeto
  cambiarEstado(nuevoEstado) {
    db.prepare('UPDATE solicitudes SET estado = ? WHERE id = ?').run(nuevoEstado, this.id);
    this.estado = nuevoEstado;
  }
}

module.exports = SolicitudTrabajo;
module.exports.LIMITES = LIMITES;
