const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/requireAuth');
const { fechaCorta } = require('../utils/fechas');

const router = express.Router();

// RF-12: el cliente ve sus solicitudes y el prestador sus propuestas, con su estado
router.get('/', requireAuth, (req, res) => {
  const usuario = req.user;

  if (usuario.rol === 'cliente') {
    const solicitudes = db
      .prepare(
        `SELECT s.id, o.nombre AS oficio, s.descripcion, s.zona, s.fecha_publicacion, s.estado,
                (SELECT COUNT(*) FROM propuestas p WHERE p.solicitud_id = s.id) AS num_propuestas,
                r.calificacion
         FROM solicitudes s
         JOIN oficios o ON o.id = s.oficio_id
         LEFT JOIN resenas r ON r.solicitud_id = s.id
         WHERE s.cliente_id = ?
         ORDER BY s.fecha_publicacion DESC`,
      )
      .all(usuario.id)
      .map((s) => ({ ...s, fecha: fechaCorta(s.fecha_publicacion) }));
    return res.render('historial/index', { titulo: 'Mi historial', tipo: 'cliente', solicitudes, propuestas: [] });
  } else if (usuario.rol === 'prestador') {
    const propuestas = db
      .prepare(
        `SELECT p.id, p.precio, p.fecha_envio, p.estado,
                s.descripcion, s.zona, s.estado AS estado_solicitud, o.nombre AS oficio,
                r.calificacion
         FROM propuestas p
         JOIN solicitudes s ON s.id = p.solicitud_id
         JOIN oficios o ON o.id = s.oficio_id
         LEFT JOIN resenas r ON r.solicitud_id = s.id AND p.estado = 'Aceptada'
         WHERE p.prestador_id = ?
         ORDER BY p.fecha_envio DESC`,
      )
      .all(usuario.id)
      .map((p) => ({ ...p, fecha: fechaCorta(p.fecha_envio) }));
    return res.render('historial/index', { titulo: 'Mi historial', tipo: 'prestador', solicitudes: [], propuestas });
  } else {
    return res.status(403).render('error', { status: 403, message: 'Tu cuenta no tiene historial' });
  }
});

// RF-12: detalle de una solicitud del cliente
router.get('/solicitudes/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
  }

  const solicitud = db
    .prepare(
      `SELECT s.id, s.cliente_id, o.nombre AS oficio, s.descripcion, s.zona, s.fecha_publicacion, s.estado
       FROM solicitudes s
       JOIN oficios o ON o.id = s.oficio_id
       WHERE s.id = ?`,
    )
    .get(id);
  if (!solicitud) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
  }
  if (solicitud.cliente_id !== req.user.id) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa solicitud' });
  }

  const resena = db
    .prepare('SELECT calificacion, comentario, fecha FROM resenas WHERE solicitud_id = ?')
    .get(id);
  res.render('historial/solicitud', { titulo: 'Detalle de la solicitud', solicitud: { ...solicitud, fecha: fechaCorta(solicitud.fecha_publicacion) }, resena });
});

// RF-12: detalle de una propuesta del prestador
router.get('/propuestas/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa propuesta' });
  }

  const propuesta = db
    .prepare(
      `SELECT p.id, p.prestador_id, p.precio, p.disponibilidad, p.mensaje, p.fecha_envio, p.estado,
              s.descripcion, s.zona, s.estado AS estado_solicitud, o.nombre AS oficio,
              r.calificacion, r.comentario AS resena_comentario
       FROM propuestas p
       JOIN solicitudes s ON s.id = p.solicitud_id
       JOIN oficios o ON o.id = s.oficio_id
       LEFT JOIN resenas r ON r.solicitud_id = s.id AND p.estado = 'Aceptada'
       WHERE p.id = ?`,
    )
    .get(id);
  if (!propuesta) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa propuesta' });
  }
  if (propuesta.prestador_id !== req.user.id) {
    return res.status(404).render('error', { status: 404, message: 'No encontramos esa propuesta' });
  }

  res.render('historial/propuesta', { titulo: 'Detalle de la propuesta', propuesta: { ...propuesta, fecha: fechaCorta(propuesta.fecha_envio) } });
});

module.exports = router;
