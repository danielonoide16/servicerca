const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// Convierte el id de la URL en número. Regresa null si no es un entero positivo
function leerId(texto) {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function noEncontrado(res, nombre) {
  return res.status(404).render('error', { status: 404, message: `No encontramos esa ${nombre}` });
}

function sinPermiso(res, nombre) {
  return res.status(403).render('error', { status: 403, message: `No tienes permiso para ver esta ${nombre}` });
}

// RF-12: el cliente ve sus solicitudes y el prestador sus propuestas, con su estado
router.get('/', requireAuth, (req, res) => {
  const usuario = req.user;

  if (usuario.rol === 'cliente') {
    const solicitudes = db
      .prepare(
        `SELECT s.id, o.nombre AS oficio, s.descripcion, s.zona, s.fecha_publicacion, s.estado,
                (SELECT COUNT(*) FROM propuestas p WHERE p.solicitud_id = s.id) AS num_propuestas
         FROM solicitudes s
         JOIN oficios o ON o.id = s.oficio_id
         WHERE s.cliente_id = ?
         ORDER BY s.fecha_publicacion DESC`,
      )
      .all(usuario.id);
    return res.render('historial/index', { titulo: 'Mi historial', tipo: 'cliente', solicitudes, propuestas: [] });
  } else if (usuario.rol === 'prestador') {
    const propuestas = db
      .prepare(
        `SELECT p.id, p.precio, p.fecha_envio, p.estado,
                s.descripcion, s.zona, s.estado AS estado_solicitud, o.nombre AS oficio
         FROM propuestas p
         JOIN solicitudes s ON s.id = p.solicitud_id
         JOIN oficios o ON o.id = s.oficio_id
         WHERE p.prestador_id = ?
         ORDER BY p.fecha_envio DESC`,
      )
      .all(usuario.id);
    return res.render('historial/index', { titulo: 'Mi historial', tipo: 'prestador', solicitudes: [], propuestas });
  } else {
    return res.status(403).render('error', { status: 403, message: 'Tu cuenta no tiene historial' });
  }
});

// RF-12: detalle de una solicitud del cliente
router.get('/solicitudes/:id', requireAuth, (req, res) => {
  const id = leerId(req.params.id);
  if (!id) return noEncontrado(res, 'solicitud');

  const solicitud = db
    .prepare(
      `SELECT s.id, s.cliente_id, o.nombre AS oficio, s.descripcion, s.zona, s.fecha_publicacion, s.estado
       FROM solicitudes s
       JOIN oficios o ON o.id = s.oficio_id
       WHERE s.id = ?`,
    )
    .get(id);
  if (!solicitud) return noEncontrado(res, 'solicitud');
  if (solicitud.cliente_id !== req.user.id) return sinPermiso(res, 'solicitud');

  const resena = db
    .prepare('SELECT calificacion, comentario, fecha FROM resenas WHERE solicitud_id = ?')
    .get(id);
  res.render('historial/solicitud', { titulo: 'Detalle de la solicitud', solicitud, resena });
});

// RF-12: detalle de una propuesta del prestador
router.get('/propuestas/:id', requireAuth, (req, res) => {
  const id = leerId(req.params.id);
  if (!id) return noEncontrado(res, 'propuesta');

  const propuesta = db
    .prepare(
      `SELECT p.id, p.prestador_id, p.precio, p.disponibilidad, p.mensaje, p.fecha_envio, p.estado,
              s.descripcion, s.zona, s.estado AS estado_solicitud, o.nombre AS oficio
       FROM propuestas p
       JOIN solicitudes s ON s.id = p.solicitud_id
       JOIN oficios o ON o.id = s.oficio_id
       WHERE p.id = ?`,
    )
    .get(id);
  if (!propuesta) return noEncontrado(res, 'propuesta');
  if (propuesta.prestador_id !== req.user.id) return sinPermiso(res, 'propuesta');

  res.render('historial/propuesta', { titulo: 'Detalle de la propuesta', propuesta });
});

module.exports = router;
