const db = require('../db/db');
const { ESTADOS_SOLICITUD } = require('../db/tipos');

const CALIFICACION_MIN = 1;
const CALIFICACION_MAX = 5;
const COMENTARIO_MAX = 500;

// Calificación que deja el cliente cuando su solicitud está completada (RF-11, RN-05)
class Resena {
  constructor(solicitudId, calificacion, comentario, fecha) {
    this.solicitudId = solicitudId;
    this.calificacion = calificacion;
    this.comentario = comentario;
    this.fecha = fecha;
  }

  static buscarPorSolicitud(solicitudId) {
    const fila = db
      .prepare('SELECT solicitud_id, calificacion, comentario, fecha FROM resenas WHERE solicitud_id = ?')
      .get(solicitudId);
    return fila ? new Resena(fila.solicitud_id, fila.calificacion, fila.comentario, fila.fecha) : null;
  }

  // RF-11: valida y guarda la reseña de una solicitud (un objeto SolicitudTrabajo).
  // Regresa { errores, resena }: si hay errores, resena es null.
  static registrar(solicitud, usuarioId, calificacion, comentario) {
    const errores = [];

    if (solicitud.clienteId !== usuarioId) {
      errores.push('No tienes permiso para reseñar esta solicitud');
      return { errores, resena: null };
    }
    if (solicitud.estado !== ESTADOS_SOLICITUD.COMPLETADA) {
      errores.push('Solo puedes reseñar una solicitud completada');
      return { errores, resena: null };
    }
    if (Resena.buscarPorSolicitud(solicitud.id)) {
      errores.push('Ya dejaste una reseña para esta solicitud');
      return { errores, resena: null };
    }

    if (!Number.isInteger(calificacion) || calificacion < CALIFICACION_MIN || calificacion > CALIFICACION_MAX) {
      errores.push(`Elige una calificación de ${CALIFICACION_MIN} a ${CALIFICACION_MAX}`);
    }
    if (comentario && comentario.trim().length > COMENTARIO_MAX) {
      errores.push(`El comentario debe tener como máximo ${COMENTARIO_MAX} caracteres`);
    }
    if (errores.length > 0) return { errores, resena: null };

    const texto = comentario && comentario.trim() !== '' ? comentario.trim() : null;
    db.prepare('INSERT INTO resenas (solicitud_id, calificacion, comentario) VALUES (?, ?, ?)')
      .run(solicitud.id, calificacion, texto);

    return { errores: [], resena: Resena.buscarPorSolicitud(solicitud.id) };
  }
}

module.exports = Resena;
module.exports.LIMITES = { CALIFICACION_MIN, CALIFICACION_MAX, COMENTARIO_MAX };
