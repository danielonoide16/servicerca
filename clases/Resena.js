const db = require('../db/db');

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
    if (solicitud.estado !== 'Completada') {
      errores.push('Solo puedes reseñar una solicitud completada');
      return { errores, resena: null };
    }
    if (Resena.buscarPorSolicitud(solicitud.id)) {
      errores.push('Ya dejaste una reseña para esta solicitud');
      return { errores, resena: null };
    }

    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      errores.push('Elige una calificación de 1 a 5');
    }
    if (comentario && comentario.trim().length > 500) {
      errores.push('El comentario debe tener como máximo 500 caracteres');
    }
    if (errores.length > 0) return { errores, resena: null };

    const texto = comentario && comentario.trim() !== '' ? comentario.trim() : null;
    db.prepare('INSERT INTO resenas (solicitud_id, calificacion, comentario) VALUES (?, ?, ?)')
      .run(solicitud.id, calificacion, texto);

    return { errores: [], resena: Resena.buscarPorSolicitud(solicitud.id) };
  }
}

module.exports = Resena;
